import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppInvitation";
import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function putTodoAppTodoUserListsListIdInvitationsInvitationId(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  invitationId: string & tags.Format<"uuid">;
  body: ITodoAppInvitation.IUpdate;
}): Promise<ITodoAppInvitation> {
  const { todoUser, listId, invitationId, body } = props;

  // Load the invitation and ensure it belongs to the specified list
  const invitation = await MyGlobal.prisma.todo_app_invitations.findFirst({
    where: { id: invitationId, todo_app_list_id: listId },
  });
  if (!invitation) throw new HttpException("Not Found", 404);

  // Load list to verify owner
  const list = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
  });
  if (!list) throw new HttpException("Not Found", 404);

  const isOwner = list.todo_app_todouser_id === todoUser.id;
  const isInvitee = invitation.invitee_todouser_id === todoUser.id;

  if (!isOwner && !isInvitee) {
    throw new HttpException(
      "Unauthorized: only invitee or owner can modify invitation",
      403,
    );
  }

  // Check expiry: invitation.expires_at is Date from Prisma; compare safely
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    throw new HttpException("Invitation expired", 409);
  }

  // Validate requested state if provided
  const requestedState = body.state;
  const allowedStates = [
    "pending",
    "accepted",
    "declined",
    "expired",
    "revoked",
  ];
  if (requestedState !== undefined && !allowedStates.includes(requestedState)) {
    throw new HttpException("Invalid state", 400);
  }

  // Disallow non-pending -> new state transitions
  if (requestedState !== undefined && requestedState !== invitation.state) {
    if (invitation.state !== "pending") {
      throw new HttpException("Invalid state transition", 409);
    }
  }

  const now = toISOStringSafe(new Date());

  try {
    if (requestedState === "accepted") {
      // Only invitee may accept. If invitee_todouser_id is null, allow if the authenticated user's email matches invitee_email
      const currentUser = await MyGlobal.prisma.todo_app_todouser.findUnique({
        where: { id: todoUser.id },
      });
      if (!currentUser) throw new HttpException("Unauthorized", 403);

      const canAccept =
        invitation.invitee_todouser_id === todoUser.id ||
        (invitation.invitee_todouser_id === null &&
          invitation.invitee_email === currentUser.email);
      if (!canAccept)
        throw new HttpException("Unauthorized: only invitee can accept", 403);

      // Atomic operation: create collaborator membership and update invitation and audit log
      await MyGlobal.prisma.$transaction(async (tx) => {
        await tx.todo_app_list_collaborators.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            todo_app_list_id: listId,
            todo_app_todouser_id: todoUser.id,
            added_by_todouser_id: invitation.inviter_todouser_id ?? todoUser.id,
            role: "read-write",
            accepted_at: now,
            created_at: now,
            updated_at: now,
          },
        });

        await tx.todo_app_invitations.update({
          where: { id: invitationId },
          data: {
            state: "accepted",
            accepted_at: now,
            // If invitee_todouser_id is null, bind it to the accepting user
            invitee_todouser_id:
              invitation.invitee_todouser_id === null ? todoUser.id : undefined,
            message: body.message === undefined ? undefined : body.message,
            updated_at: now,
          },
        });

        await tx.todo_app_audit_logs.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            todo_app_todouser_id: todoUser.id,
            todo_app_list_id: listId,
            event_type: "invitation:state_change",
            details: `Invitation ${invitationId} accepted by ${todoUser.id}`,
            created_at: now,
            updated_at: now,
          },
        });
      });
    } else {
      // Non-accept paths (revoked/declined/message update)
      if (requestedState === "revoked" && !isOwner) {
        throw new HttpException("Unauthorized: only owner can revoke", 403);
      }
      if (requestedState === "declined" && !isInvitee) {
        throw new HttpException("Unauthorized: only invitee can decline", 403);
      }

      await MyGlobal.prisma.todo_app_invitations.update({
        where: { id: invitationId },
        data: {
          ...(requestedState !== undefined ? { state: requestedState } : {}),
          message: body.message === undefined ? undefined : body.message,
          updated_at: now,
        },
      });

      await MyGlobal.prisma.todo_app_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_todouser_id: todoUser.id,
          todo_app_list_id: listId,
          event_type: "invitation:state_change",
          details: `Invitation ${invitationId} state updated to ${requestedState ?? invitation.state}`,
          created_at: now,
          updated_at: now,
        },
      });
    }
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new HttpException("Conflict: collaborator already exists", 409);
    }
    throw e;
  }

  // Reload updated invitation with related summaries
  const updated = await MyGlobal.prisma.todo_app_invitations.findUnique({
    where: { id: invitationId },
    include: {
      list: { include: { owner: true } },
      inviter: true,
      inviterSession: true,
      invitee: true,
    },
  });
  if (!updated) throw new HttpException("Not Found", 404);

  // Map DB result to API DTO
  return {
    id: updated.id,
    list: {
      id: updated.list.id,
      title: updated.list.title,
      visibility: updated.list.visibility,
      owner: {
        id: updated.list.owner.id,
        displayName: updated.list.owner.display_name ?? undefined,
        isVerified: updated.list.owner.is_verified,
        status: updated.list.owner.status ?? undefined,
        createdAt: toISOStringSafe(updated.list.owner.created_at),
        updatedAt: toISOStringSafe(updated.list.owner.updated_at),
      },
      description: updated.list.description ?? undefined,
      createdAt: toISOStringSafe(updated.list.created_at),
      updatedAt: toISOStringSafe(updated.list.updated_at),
      deletedAt: updated.list.deleted_at
        ? toISOStringSafe(updated.list.deleted_at)
        : undefined,
    },
    inviter: {
      id: updated.inviter.id,
      displayName: updated.inviter.display_name ?? undefined,
      isVerified: updated.inviter.is_verified,
      status: updated.inviter.status ?? undefined,
      createdAt: toISOStringSafe(updated.inviter.created_at),
      updatedAt: toISOStringSafe(updated.inviter.updated_at),
    },
    inviter_session: updated.inviterSession
      ? {
          id: updated.inviterSession.id,
          user: {
            id: updated.inviter.id,
            displayName: updated.inviter.display_name ?? undefined,
            isVerified: updated.inviter.is_verified,
            status: updated.inviter.status ?? undefined,
            createdAt: toISOStringSafe(updated.inviter.created_at),
            updatedAt: toISOStringSafe(updated.inviter.updated_at),
          },
          ip: updated.inviterSession.ip,
          href: updated.inviterSession.href ?? undefined,
          referrer: updated.inviterSession.referrer ?? undefined,
          createdAt: toISOStringSafe(updated.inviterSession.created_at),
          expiredAt: updated.inviterSession.expired_at
            ? toISOStringSafe(updated.inviterSession.expired_at)
            : undefined,
        }
      : undefined,
    invitee: updated.invitee
      ? {
          id: updated.invitee.id,
          displayName: updated.invitee.display_name ?? undefined,
          isVerified: updated.invitee.is_verified,
          status: updated.invitee.status ?? undefined,
          createdAt: toISOStringSafe(updated.invitee.created_at),
          updatedAt: toISOStringSafe(updated.invitee.updated_at),
        }
      : undefined,
    invitee_email: updated.invitee_email ?? undefined,
    invite_code: updated.invite_code,
    message: updated.message ?? null,
    state: typia.assert<
      "pending" | "accepted" | "declined" | "expired" | "revoked"
    >(updated.state),
    expires_at: toISOStringSafe(updated.expires_at),
    accepted_at: updated.accepted_at
      ? toISOStringSafe(updated.accepted_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

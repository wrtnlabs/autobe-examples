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

export async function getTodoAppTodoUserListsListIdInvitationsInvitationId(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  invitationId: string & tags.Format<"uuid">;
}): Promise<ITodoAppInvitation> {
  const { todoUser, listId, invitationId } = props;

  // Fetch invitation and necessary related summaries in a single query
  const invitation = await MyGlobal.prisma.todo_app_invitations.findUnique({
    where: { id: invitationId },
    include: {
      list: {
        select: {
          id: true,
          title: true,
          visibility: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          todo_app_todouser_id: true,
          owner: {
            select: {
              id: true,
              display_name: true,
              is_verified: true,
              status: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
      inviter: {
        select: {
          id: true,
          display_name: true,
          is_verified: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      },
      inviterSession: {
        select: {
          id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
          todouser: {
            select: {
              id: true,
              display_name: true,
              is_verified: true,
              status: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
      invitee: {
        select: {
          id: true,
          display_name: true,
          is_verified: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });

  if (!invitation) throw new HttpException("Not Found", 404);
  if (!invitation.list || invitation.list.id !== listId)
    throw new HttpException("Not Found", 404);

  const isOwner =
    (invitation.list.todo_app_todouser_id &&
      invitation.list.todo_app_todouser_id === todoUser.id) ||
    (invitation.list.owner && invitation.list.owner.id === todoUser.id);
  const isInvitee =
    (invitation.invitee_todouser_id &&
      invitation.invitee_todouser_id === todoUser.id) ||
    (invitation.invitee && invitation.invitee.id === todoUser.id);

  let isCollaborator = false;
  if (!isOwner && !isInvitee) {
    const collab = await MyGlobal.prisma.todo_app_list_collaborators.findFirst({
      where: {
        todo_app_list_id: listId,
        todo_app_todouser_id: todoUser.id,
        deleted_at: null,
      },
    });
    isCollaborator = !!collab;
  }

  if (!isOwner && !isInvitee && !isCollaborator) {
    throw new HttpException("Unauthorized", 403);
  }

  const showInviteCode = isOwner || isInvitee;
  const showInviteeEmail = isOwner || isInvitee;

  const listSummary = {
    id: invitation.list.id as string & tags.Format<"uuid">,
    title: invitation.list.title,
    visibility: invitation.list.visibility,
    owner: {
      id: invitation.list.owner.id as string & tags.Format<"uuid">,
      displayName: invitation.list.owner.display_name ?? undefined,
      isVerified: invitation.list.owner.is_verified,
      status: invitation.list.owner.status ?? undefined,
      createdAt: toISOStringSafe(invitation.list.owner.created_at),
      updatedAt: toISOStringSafe(invitation.list.owner.updated_at),
    },
    description: invitation.list.description ?? undefined,
    createdAt: toISOStringSafe(invitation.list.created_at),
    updatedAt: toISOStringSafe(invitation.list.updated_at),
    deletedAt: invitation.list.deleted_at
      ? toISOStringSafe(invitation.list.deleted_at)
      : undefined,
  } satisfies ITodoAppList.ISummary;

  const inviterSummary = {
    id: invitation.inviter.id as string & tags.Format<"uuid">,
    displayName: invitation.inviter.display_name ?? undefined,
    isVerified: invitation.inviter.is_verified,
    status: invitation.inviter.status ?? undefined,
    createdAt: toISOStringSafe(invitation.inviter.created_at),
    updatedAt: toISOStringSafe(invitation.inviter.updated_at),
  } satisfies ITodoAppTodoUser.ISummary;

  const inviterSessionSummary = invitation.inviterSession
    ? {
        id: invitation.inviterSession.id as string & tags.Format<"uuid">,
        user: {
          id: invitation.inviterSession.todouser.id as string &
            tags.Format<"uuid">,
          displayName:
            invitation.inviterSession.todouser.display_name ?? undefined,
          isVerified: invitation.inviterSession.todouser.is_verified,
          status: invitation.inviterSession.todouser.status ?? undefined,
          createdAt: toISOStringSafe(
            invitation.inviterSession.todouser.created_at,
          ),
          updatedAt: toISOStringSafe(
            invitation.inviterSession.todouser.updated_at,
          ),
        },
        ip: invitation.inviterSession.ip,
        href: invitation.inviterSession.href ?? undefined,
        referrer: invitation.inviterSession.referrer ?? null,
        createdAt: toISOStringSafe(invitation.inviterSession.created_at),
        expiredAt: invitation.inviterSession.expired_at
          ? toISOStringSafe(invitation.inviterSession.expired_at)
          : undefined,
      }
    : undefined;

  const inviteeSummary = invitation.invitee
    ? {
        id: invitation.invitee.id as string & tags.Format<"uuid">,
        displayName: invitation.invitee.display_name ?? undefined,
        isVerified: invitation.invitee.is_verified,
        status: invitation.invitee.status ?? undefined,
        createdAt: toISOStringSafe(invitation.invitee.created_at),
        updatedAt: toISOStringSafe(invitation.invitee.updated_at),
      }
    : undefined;

  // Build and return DTO. Note: invite_code is redacted for non-owner/non-invitee callers
  const result: ITodoAppInvitation = {
    id: invitation.id as string & tags.Format<"uuid">,
    list: listSummary,
    inviter: inviterSummary,
    inviter_session: inviterSessionSummary ?? undefined,
    invitee: inviteeSummary ?? undefined,
    invitee_email: showInviteeEmail
      ? (invitation.invitee_email ?? null)
      : undefined,
    invite_code: showInviteCode ? invitation.invite_code : "[REDACTED]",
    message: invitation.message ?? null,
    state: invitation.state as
      | "pending"
      | "accepted"
      | "declined"
      | "expired"
      | "revoked",
    expires_at: toISOStringSafe(invitation.expires_at),
    accepted_at: invitation.accepted_at
      ? toISOStringSafe(invitation.accepted_at)
      : null,
    created_at: toISOStringSafe(invitation.created_at),
    updated_at: toISOStringSafe(invitation.updated_at),
    deleted_at: invitation.deleted_at
      ? toISOStringSafe(invitation.deleted_at)
      : null,
  };

  return result;
}

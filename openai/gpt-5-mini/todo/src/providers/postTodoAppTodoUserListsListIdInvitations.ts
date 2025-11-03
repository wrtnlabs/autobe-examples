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

export async function postTodoAppTodoUserListsListIdInvitations(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  body: ITodoAppInvitation.ICreate;
}): Promise<ITodoAppInvitation> {
  const { todoUser, listId, body } = props;

  try {
    // Verify target list exists and is active
    const list = await MyGlobal.prisma.todo_app_lists.findFirst({
      where: { id: listId, deleted_at: null },
      include: { owner: true },
    });

    if (!list) throw new HttpException("List not found", 404);

    // Authorization: allow owner or active collaborator
    if (list.todo_app_todouser_id !== todoUser.id) {
      const membership =
        await MyGlobal.prisma.todo_app_list_collaborators.findFirst({
          where: {
            todo_app_list_id: listId,
            todo_app_todouser_id: todoUser.id,
            deleted_at: null,
          },
        });

      if (!membership)
        throw new HttpException(
          "Unauthorized: must be list owner or collaborator",
          403,
        );
    }

    // Extract possible input fields (ICreate is dynamic in generated DTOs)
    const inviteeTodouserId = (body as any).invitee_todouser_id ?? null;
    const inviteeEmail = (body as any).invitee_email ?? null;
    const message = (body as any).message ?? null;

    if (inviteeTodouserId === null && inviteeEmail === null) {
      throw new HttpException(
        "Either invitee_todouser_id or invitee_email must be provided",
        400,
      );
    }

    // If invitee_todouser_id provided, validate target user exists and active
    let inviteeRecord: null | {
      id: string;
      display_name?: string | null;
      is_verified: boolean;
      status?: string | null;
      created_at: Date | string;
      updated_at: Date | string;
    } = null;
    if (inviteeTodouserId !== null) {
      inviteeRecord = await MyGlobal.prisma.todo_app_todouser.findFirst({
        where: { id: inviteeTodouserId, deleted_at: null },
      });
      if (!inviteeRecord)
        throw new HttpException("Invitee user not found", 404);
    }

    // Check uniqueness against active invitations
    const existing = await MyGlobal.prisma.todo_app_invitations.findFirst({
      where: {
        todo_app_list_id: listId,
        deleted_at: null,
        OR: [
          ...(inviteeTodouserId
            ? [{ invitee_todouser_id: inviteeTodouserId }]
            : []),
          ...(inviteeEmail ? [{ invitee_email: inviteeEmail }] : []),
        ],
      },
    });

    if (existing)
      throw new HttpException(
        "Conflict: active invitation already exists",
        409,
      );

    // Prepare timestamps
    const now = toISOStringSafe(new Date());
    const expiresAt = toISOStringSafe(
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    );

    // Create invitation (inline data for clear Prisma typing)
    const created = await MyGlobal.prisma.todo_app_invitations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_list_id: listId,
        inviter_todouser_id: todoUser.id,
        inviter_todouser_session_id: todoUser.session_id,
        invitee_todouser_id: inviteeTodouserId ?? null,
        invitee_email: inviteeEmail ?? null,
        invite_code: v4(),
        message: message ?? null,
        state: "pending",
        expires_at: expiresAt,
        created_at: now,
        updated_at: now,
      },
    });

    // Emit audit and activity logs in parallel
    await Promise.all([
      MyGlobal.prisma.todo_app_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_todouser_id: todoUser.id,
          todo_app_todouser_session_id: todoUser.session_id,
          todo_app_list_id: listId,
          event_type: "invite.create",
          details: message ?? null,
          created_at: now,
          updated_at: now,
        },
      }),
      MyGlobal.prisma.todo_app_user_activity_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_todouser_id: todoUser.id,
          todo_app_todouser_session_id: todoUser.session_id,
          todo_app_list_id: listId,
          activity_type: "invite_create",
          details: message ?? null,
          created_at: now,
          updated_at: now,
        },
      }),
    ]);

    // Build inviter summary from list.owner (owner record fetched above)
    const inviterSummary = {
      id: list.owner.id,
      displayName: list.owner.display_name ?? null,
      isVerified: list.owner.is_verified,
      status: list.owner.status ?? undefined,
      createdAt: toISOStringSafe(list.owner.created_at),
      updatedAt: toISOStringSafe(list.owner.updated_at),
    } satisfies ITodoAppTodoUser.ISummary;

    // Build list summary
    const listSummary = {
      id: list.id,
      title: list.title,
      visibility: list.visibility,
      owner: inviterSummary,
      description: list.description ?? null,
      createdAt: toISOStringSafe(list.created_at),
      updatedAt: toISOStringSafe(list.updated_at),
      deletedAt: list.deleted_at ? toISOStringSafe(list.deleted_at) : null,
    } satisfies ITodoAppList.ISummary;

    // Build invitee summary if user provided
    const inviteeSummary = inviteeRecord
      ? ({
          id: inviteeRecord.id,
          displayName: inviteeRecord.display_name ?? null,
          isVerified: inviteeRecord.is_verified,
          status: inviteeRecord.status ?? undefined,
          createdAt: toISOStringSafe(inviteeRecord.created_at),
          updatedAt: toISOStringSafe(inviteeRecord.updated_at),
        } satisfies ITodoAppTodoUser.ISummary)
      : undefined;

    // Construct final DTO respecting null vs undefined rules from ITodoAppInvitation
    const result: ITodoAppInvitation = {
      id: created.id,
      list: listSummary,
      inviter: inviterSummary,
      inviter_session: undefined,
      invitee: inviteeSummary ?? undefined,
      invitee_email: created.invitee_email ?? null,
      invite_code: created.invite_code,
      message: created.message ?? null,
      state: typia.assert<
        "expired" | "pending" | "accepted" | "declined" | "revoked"
      >(created.state),
      expires_at: toISOStringSafe(created.expires_at),
      accepted_at: created.accepted_at
        ? toISOStringSafe(created.accepted_at)
        : null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };

    return result;
  } catch (err: unknown) {
    if (err instanceof HttpException) throw err;
    // Unexpected error
    throw new HttpException("Internal Server Error", 500);
  }
}

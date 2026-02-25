import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardAdministratorRequestTransformer } from "../transformers/DiscussionBoardAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdministratorAdministratorRequestsRequestId(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorRequest.IUpdate;
}): Promise<IDiscussionBoardAdministratorRequest> {
  const allowedStatuses = ["pending", "approved", "rejected"] as const;
  if (
    props.body.status !== undefined &&
    !allowedStatuses.includes(props.body.status)
  ) {
    throw new HttpException("Invalid status value", 400);
  }
  const selectPayload = {
    id: true,
    registered_user_id: true,
    reason: true,
    status: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
    registeredUser: {
      select: {
        id: true,
        email: true,
        display_name: true,
        bio: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
        comments: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            content: true,
            discussion_board_article_id: true,
            discussion_board_registered_user_id: true,
          },
        },
        sessions: {
          select: {
            id: true,
            created_at: true,
            registered_user_id: true,
            ip: true,
            href: true,
            referrer: true,
            expired_at: true,
          },
        },
        passwordResets: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            registered_user_id: true,
            expired_at: true,
            token: true,
          },
        },
        emailVerifications: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            registered_user_id: true,
            expired_at: true,
            token: true,
          },
        },
        auditLogs: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            actor_id: true,
            event_type: true,
            event_description: true,
          },
        },
        articles: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            registered_user_id: true,
            section_id: true,
            title: true,
            content: true,
          },
        },
        administratorRequests: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            registered_user_id: true,
            reason: true,
            status: true,
          },
        },
        userBans: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            registered_user_id: true,
            administrator_id: true,
            reason: true,
            banned_at: true,
          },
        },
      },
    },
  } satisfies Prisma.discussion_board_administrator_requestsSelect;
  const existingRequest =
    await MyGlobal.prisma.discussion_board_administrator_requests.findUnique({
      where: { id: props.requestId },
      select: selectPayload,
    });
  if (!existingRequest || existingRequest.deleted_at !== null) {
    throw new HttpException("Administrator request not found", 404);
  }
  const updatedRecord = await MyGlobal.prisma.$transaction(async (tx) => {
    return tx.discussion_board_administrator_requests.update({
      where: { id: props.requestId },
      data: {
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.reason !== undefined && { reason: props.body.reason }),
        updated_at: toISOStringSafe(new Date()),
      },
      select: selectPayload,
    });
  });
  return DiscussionBoardAdministratorRequestTransformer.transform(
    updatedRecord,
  );
}

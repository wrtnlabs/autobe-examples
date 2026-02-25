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
import { DiscussionBoardAdministratorRequestCollector } from "../collectors/DiscussionBoardAdministratorRequestCollector";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardAdministratorRequestTransformer } from "../transformers/DiscussionBoardAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardRegisteredUserAdministratorRequests(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardAdministratorRequest.ICreate;
}): Promise<IDiscussionBoardAdministratorRequest> {
  const data = await DiscussionBoardAdministratorRequestCollector.collect({
    body: props.body,
    registeredUser: { id: props.registeredUser.id },
  });
  const created =
    await MyGlobal.prisma.discussion_board_administrator_requests.create({
      data,
      select: {
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
            password_hash: true,
            display_name: true,
            bio: true,
            is_banned: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
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
      },
    });
  return await DiscussionBoardAdministratorRequestTransformer.transform(
    created,
  );
}

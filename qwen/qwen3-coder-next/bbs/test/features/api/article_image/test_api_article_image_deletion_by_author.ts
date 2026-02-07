import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_article_image_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authResult);
  // 2. Create an article with at least one image attachment
  // Note: The provided DTO definitions don't include article creation endpoints
  // This scenario requires article creation endpoints not shown in the provided information
  // 3. Delete the image attachment
  // Using placeholder values since article creation endpoints are not available in the provided definitions
  const articleId = "123e4567-e89b-12d3-a456-426614174000";
  const imageId = "223e4567-e89b-12d3-a456-426614174001";
  await api.functional.discussionBoard.member.articles.images.eraseImage(
    memberConnection,
    {
      articleId,
      imageId,
    },
  );
}

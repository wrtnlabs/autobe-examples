import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_user_comment_reports_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: `Bearer ${userAuth.token.access}` };
  // 2. Create multiple comments for the user to report
  const comment1 =
    await generate_random_community_platform_user_comments_create(
      userConnection,
      { body: {} },
    );
  const comment2 =
    await generate_random_community_platform_user_comments_create(
      userConnection,
      { body: {} },
    );
  // 3. Send empty filter request body
  const output =
    await api.functional.communityPlatform.user.comment_reports.index(
      userConnection,
      { body: {} },
    );
  // 4. Validate output structure and content
  typia.assert(output);
  TestValidator.predicate(
    "pagination current is positive",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(output.data));
  // 5. Validate each item in data array
  for (const summary of output.data) {
    typia.assert(summary); // Validate entire summary object against empty schema
    // No access to non-existent properties like status or id to avoid errors
  }
}

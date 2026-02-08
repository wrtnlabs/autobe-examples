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

export async function test_api_user_comment_reports_retrieval_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Test edge case where no comment reports match the filtering criteria
  // 1. Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {}, // ICommunityPlatformUser.IJoin is empty, pass empty object
  });
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // 2. Create a comment (required dependency, though not reported)
  const comment = await generate_random_community_platform_user_comments_create(
    userConnection,
    {
      body: {}, // empty partial to generate random
    },
  );
  typia.assert(comment);
  // 3. Attempt to retrieve comment reports with filtering criteria that
  // definitely matches no records (invalid status and fake reporterUserId)
  const response =
    await api.functional.communityPlatform.user.comment_reports.index(
      userConnection,
      {
        body: {
          status: "NON_EXISTENT_STATUS", // intentionally invalid status to filter no results
          reporterUserId: "00000000-0000-0000-0000-000000000000", // impossible UUID
          limit: 10,
          current: 1,
        } as any, // type coerced because schema not detailed, but we respect scenario
      },
    );
  typia.assert(response);
  // 4. Validate that response has empty data array
  TestValidator.equals("empty data array", response.data.length, 0);
  // 5. Validate pagination metadata shows zero records and pages
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
}

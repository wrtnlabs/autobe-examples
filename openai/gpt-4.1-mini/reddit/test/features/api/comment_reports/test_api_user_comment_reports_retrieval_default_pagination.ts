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

export async function test_api_user_comment_reports_retrieval_default_pagination(
  connection: api.IConnection,
) {
  // Create a user actor connection and join user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(connection, { body: {} });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Generate some comments as prerequisite for comment reports
  const comments = await ArrayUtil.asyncRepeat(3, async () =>
    generate_random_community_platform_user_comments_create(userConnection, {
      body: {},
    }),
  );
  // Compose request body, empty filters for default pagination
  const body: ICommunityPlatformCommentReport.IRequest = {};
  // Invoke endpoint under user connection with filters
  const output: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.user.comment_reports.index(
      userConnection,
      {
        body,
      },
    );
  // Assert output structure
  typia.assert(output);
  // Assert pagination metadata validity
  TestValidator.predicate(
    "pagination current page is 1 or more",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  // Assert data is an array
  TestValidator.predicate("data is array", Array.isArray(output.data));
  // Additional checks could include verifying sorted order by createdAt ascending,
  // but since comment reports creation is not done here, just ensure no crash
}

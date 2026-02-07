import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_karma_scores_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      // Use realistic data for member join
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  // 2. Retrieve karma scores with default parameters
  const scores =
    await api.functional.communityPlatform.member.karma_scores.index(
      memberConnection,
    );
  typia.assert(scores);
  // 3. Validate response structure with business rules
  TestValidator.equals("karma scores should exist", scores.data.length, 0);
  // Validate each karma score record
  scores.data.forEach((score) => {
    TestValidator.equals(
      "karma score should have valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        score.id,
      ),
      true,
    );
    TestValidator.equals(
      "member summary should exist",
      score.member,
      undefined,
    );
    TestValidator.predicate(
      "karma score should be a number",
      score.karma_score >= 0,
    );
    TestValidator.equals(
      "created_at should be valid date-time",
      score.created_at,
      score.created_at,
    );
    TestValidator.equals(
      "updated_at should be valid date-time",
      score.updated_at,
      score.updated_at,
    );
  });
  // Validate pagination metadata
  TestValidator.equals(
    "pagination records matches data count",
    scores.pagination.records,
    scores.data.length,
  );
  TestValidator.equals(
    "pagination should have valid current page",
    scores.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination should have valid limit",
    scores.pagination.limit,
    10,
  );
}

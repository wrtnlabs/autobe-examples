import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarma";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarma";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_karma_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate using authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(16), // Increased length for uniqueness
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 2. Call karma listing endpoint with minimal parameters (default pagination)
  const response = await api.functional.communityPlatform.member.karmas.index(
    memberConnection,
    {
      body: {} satisfies ICommunityPlatformKarma.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination business logic
  TestValidator.predicate(
    "current page should be at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit should be between 1 and 100",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate pagination calculation
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation should match records/limit",
    response.pagination.pages,
    expectedPages,
  );
  // 5. Validate karma data business logic
  for (const karma of response.data) {
    // typia.assert already validated the complete structure
    // Validate business logic: karma score can be negative as per requirements
    TestValidator.predicate(
      "karma score should be an integer",
      Number.isInteger(karma.score),
    );
    // Validate member information consistency
    TestValidator.predicate(
      "member should have username",
      typeof karma.member.username === "string" &&
        karma.member.username.length > 0,
    );
    TestValidator.predicate(
      "member should have email",
      typeof karma.member.email === "string" && karma.member.email.length > 0,
    );
  }
}

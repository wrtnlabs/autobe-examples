import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_discovery_list_browse(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "Aa1!",
      username: RandomGenerator.alphabets(8),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const output =
    await api.functional.communityPlatform.member.communities.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "response should include pagination metadata",
    output.pagination !== null && output.pagination !== undefined,
  );
  TestValidator.equals(
    "current page should be first page",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit should be reflected",
    output.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(output.data),
  );
  TestValidator.predicate(
    "returned items should not exceed the requested limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.equals(
    "pagination records should be consistent with returned items on a single page or fewer",
    output.data.length <= output.pagination.records,
    true,
  );
  for (const community of output.data) {
    typia.assert(community);
    TestValidator.predicate(
      "community should have an id",
      community.id.length > 0,
    );
    TestValidator.predicate(
      "community name should be present",
      community.name.length > 0,
    );
    TestValidator.predicate(
      "community description should be present",
      community.description.length > 0,
    );
    TestValidator.predicate(
      "community icon url should be present",
      community.iconImageUrl.length > 0,
    );
    TestValidator.predicate(
      "community should be publicly discoverable",
      community.deleted_at === null,
    );
  }
}

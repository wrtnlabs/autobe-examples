import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create first member account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(member1);
  // First member creates TechDiscussion community
  const techCommunity =
    await api.functional.communityPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name: "TechDiscussion",
          description: "A community for discussing technology topics",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(techCommunity);
  // Setup: Create second member account
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(member2);
  // Second member creates GamingHub community
  const gamingCommunity =
    await api.functional.communityPlatform.member.communities.create(
      member2Connection,
      {
        body: {
          name: "GamingHub",
          description: "A community for gaming enthusiasts",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(gamingCommunity);
  // Execution: Search with 'tech' (lowercase)
  const techSearchResults =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "tech",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(techSearchResults);
  // Validation: 'tech' search should return only TechDiscussion
  const techSearchNames = techSearchResults.data.map((c) => c.name);
  TestValidator.predicate(
    "TechDiscussion should appear in 'tech' search results",
    techSearchNames.includes("TechDiscussion"),
  );
  TestValidator.predicate(
    "GamingHub should NOT appear in 'tech' search results",
    !techSearchNames.includes("GamingHub"),
  );
  // Execution: Search with 'HUB' (uppercase) to test case-insensitivity
  const hubSearchResults =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "HUB",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(hubSearchResults);
  // Validation: 'HUB' search should return only GamingHub (case-insensitive)
  const hubSearchNames = hubSearchResults.data.map((c) => c.name);
  TestValidator.predicate(
    "GamingHub should appear in 'HUB' search results (case-insensitive)",
    hubSearchNames.includes("GamingHub"),
  );
  TestValidator.predicate(
    "TechDiscussion should NOT appear in 'HUB' search results",
    !hubSearchNames.includes("TechDiscussion"),
  );
}

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

export async function test_api_community_browse_all(
  connection: api.IConnection,
): Promise<void> {
  // Create first member account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // Create first community
  const community1 =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community1);
  // Create second member account
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // Create second community
  const community2 =
    await generate_random_community_platform_member_communities_create(
      member2Connection,
      {},
    );
  typia.assert(community2);
  // Browse all communities with empty request body
  const result = await api.functional.communityPlatform.communities.index(
    connection,
    { body: {} satisfies ICommunityPlatformCommunity.IRequest },
  );
  typia.assert(result);
  // Validate pagination metadata exists
  TestValidator.predicate(
    "pagination exists",
    () => result.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current",
    () => typeof result.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    () => typeof result.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records",
    () => typeof result.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages",
    () => typeof result.pagination.pages === "number",
  );
  // Validate data array exists
  TestValidator.predicate("data is array", () => Array.isArray(result.data));
  // Find our created communities in results
  const foundCommunity1 = result.data.find((c) => c.id === community1.id);
  const foundCommunity2 = result.data.find((c) => c.id === community2.id);
  TestValidator.predicate(
    "community1 found in results",
    () => foundCommunity1 !== undefined,
  );
  TestValidator.predicate(
    "community2 found in results",
    () => foundCommunity2 !== undefined,
  );
  // Validate community1 details
  if (foundCommunity1) {
    TestValidator.equals(
      "community1 name matches",
      foundCommunity1.name,
      community1.name,
    );
    TestValidator.equals(
      "community1 description matches",
      foundCommunity1.description,
      community1.description,
    );
    TestValidator.predicate(
      "community1 subscriber_count is number",
      () => typeof foundCommunity1.subscriber_count === "number",
    );
    TestValidator.predicate(
      "community1 owner exists",
      () => foundCommunity1.owner !== undefined,
    );
    TestValidator.equals(
      "community1 owner id matches",
      foundCommunity1.owner.id,
      member1.id,
    );
    TestValidator.predicate(
      "community1 created_at exists",
      () => typeof foundCommunity1.created_at === "string",
    );
  }
  // Validate community2 details
  if (foundCommunity2) {
    TestValidator.equals(
      "community2 name matches",
      foundCommunity2.name,
      community2.name,
    );
    TestValidator.equals(
      "community2 description matches",
      foundCommunity2.description,
      community2.description,
    );
    TestValidator.predicate(
      "community2 subscriber_count is number",
      () => typeof foundCommunity2.subscriber_count === "number",
    );
    TestValidator.predicate(
      "community2 owner exists",
      () => foundCommunity2.owner !== undefined,
    );
    TestValidator.equals(
      "community2 owner id matches",
      foundCommunity2.owner.id,
      member2.id,
    );
    TestValidator.predicate(
      "community2 created_at exists",
      () => typeof foundCommunity2.created_at === "string",
    );
  }
  // Validate sorted by subscriber_count DESC (default 'popular' sort)
  for (let i = 0; i < result.data.length - 1; i++) {
    TestValidator.predicate(
      `sorted by subscriber_count DESC at index ${i}`,
      () =>
        result.data[i].subscriber_count >= result.data[i + 1].subscriber_count,
    );
  }
}

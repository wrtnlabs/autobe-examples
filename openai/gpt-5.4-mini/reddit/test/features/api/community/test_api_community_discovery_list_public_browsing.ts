import api from "@ORGANIZATION/PROJECT-api";
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

export async function test_api_community_discovery_list_public_browsing(
  connection: api.IConnection,
): Promise<void> {
  const request = {
    page: 1,
    limit: 100,
  } satisfies ICommunityPlatformCommunity.IRequest;
  const guestResponse =
    await api.functional.communityPlatform.communities.index(
      { host: connection.host },
      { body: request },
    );
  typia.assert(guestResponse);
  TestValidator.equals(
    "guest pagination page",
    guestResponse.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "guest pagination limit",
    guestResponse.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "guest pagination metadata is valid",
    guestResponse.pagination.records >= 0 &&
      guestResponse.pagination.pages >= 0,
  );
  for (const community of guestResponse.data) {
    typia.assert(community);
  }
  const authenticatedConnection: api.IConnection = { host: connection.host };
  const authenticatedResponse =
    await api.functional.communityPlatform.communities.index(
      authenticatedConnection,
      { body: request },
    );
  typia.assert(authenticatedResponse);
  TestValidator.equals(
    "authenticated pagination page",
    authenticatedResponse.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "authenticated pagination limit",
    authenticatedResponse.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "authenticated browsing returns same count as guest",
    authenticatedResponse.data.length,
    guestResponse.data.length,
  );
  TestValidator.equals(
    "authenticated pagination records matches guest",
    authenticatedResponse.pagination.records,
    guestResponse.pagination.records,
  );
  TestValidator.equals(
    "authenticated pagination pages matches guest",
    authenticatedResponse.pagination.pages,
    guestResponse.pagination.pages,
  );
  for (const community of authenticatedResponse.data) {
    typia.assert(community);
  }
}

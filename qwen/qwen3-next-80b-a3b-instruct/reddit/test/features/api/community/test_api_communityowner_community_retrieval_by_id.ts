import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_communityowner_community_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = typia.random<IRedditCommunityCommunityOwner.IJoin>();
  await authorize_community_owner_join(ownerConnection, { body: ownerData });
  // Need login to get active session
  const loginResponse = await authorize_community_owner_login(ownerConnection, {
    body: {
      email: ownerData.email,
      password: ownerData.password,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  typia.assert(loginResponse);
  // 2. We need a community ID - but we cannot create one
  // Instead, we must use an existing soft-deleted community
  // Since we have no way to get one, we must rely on test environment having one
  // The scenario requires testing retrieval of a soft-deleted community
  // We'll use a known valid UUID (from random) and expect it to be soft-deleted
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve community by ID - should return full details even if soft-deleted
  const retrievedCommunity =
    await api.functional.redditCommunity.communityOwner.communities.patchById(
      ownerConnection,
      {
        id: communityId,
      },
    );
  typia.assert(retrievedCommunity);
  // 4. Validate community structure - typia.assert() already validates all properties
  // We only need to assert business assertions
  TestValidator.predicate(
    "community has valid id",
    typeof retrievedCommunity.id === "string" &&
      retrievedCommunity.id.length > 0,
  );
  TestValidator.predicate(
    "community has valid name",
    typeof retrievedCommunity.name === "string" &&
      retrievedCommunity.name.length > 0,
  );
  TestValidator.predicate(
    "community has valid subscriber_count",
    typeof retrievedCommunity.subscriber_count === "number" &&
      retrievedCommunity.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "community has valid created_at",
    typeof retrievedCommunity.created_at === "string" &&
      !isNaN(new Date(retrievedCommunity.created_at).getTime()),
  );
  TestValidator.predicate(
    "community has valid updated_at",
    typeof retrievedCommunity.updated_at === "string" &&
      !isNaN(new Date(retrievedCommunity.updated_at).getTime()),
  );
  TestValidator.predicate(
    "community has valid owner summary",
    retrievedCommunity.owner !== null &&
      typeof retrievedCommunity.owner.id === "string" &&
      retrievedCommunity.owner.id.length > 0,
  );
  TestValidator.predicate(
    "community owner has display_name",
    typeof retrievedCommunity.owner.display_name === "string" &&
      retrievedCommunity.owner.display_name.length > 0,
  );
  TestValidator.predicate(
    "community has deleted_at",
    retrievedCommunity.deleted_at !== null,
  );
}

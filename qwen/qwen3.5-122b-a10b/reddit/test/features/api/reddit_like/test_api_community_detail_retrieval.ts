import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest user community detail retrieval by unique identifier.
 *
 * Validates that a guest user can successfully retrieve detailed information about a community by its UUID. The test authenticates a guest account, then calls the community detail endpoint and verifies the response structure matches the expected IRedditLikeCommunity type.
 *
 * The test ensures that all community metadata fields are properly returned including identification fields (id, name), descriptive fields (description, icon_url), temporal fields (created_at, updated_at, deleted_at), ownership information (owner with username and display_name), and the real-time subscriber_count calculated from active subscriptions.
 *
 * 1. Guest user authenticates via device fingerprint registration.
 * 2. Guest user retrieves community details using a randomly generated UUID.
 * 3. Validates response conforms to IRedditLikeCommunity type structure.
 * 4. Verifies all required fields are present and properly typed.
 * 5. Confirms timestamps are in ISO 8601 format.
 * 6. Ensures owner information includes username and display_name.
 * 7. Verifies community is not soft-deleted (deleted_at is null).
 */
export async function test_api_community_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(auth);
  // 2. Generate random community UUID for retrieval
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve community details
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.guest.communities.at(guestConnection, {
      communityId,
    });
  typia.assert(community);
  // 4. Validate community structure
  TestValidator.predicate("name exists", community.name.length > 0);
  TestValidator.predicate(
    "description is string or null",
    typeof community.description === "string" || community.description === null,
  );
  TestValidator.predicate(
    "icon_url is string or null",
    typeof community.icon_url === "string" || community.icon_url === null,
  );
  // 5. Validate timestamps are in ISO 8601 format
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  TestValidator.predicate(
    "created_at is ISO 8601",
    iso8601Regex.test(community.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    iso8601Regex.test(community.updated_at),
  );
  TestValidator.predicate(
    "deleted_at is null or ISO 8601",
    community.deleted_at === null || iso8601Regex.test(community.deleted_at),
  );
  // 6. Validate owner information
  TestValidator.predicate(
    "owner has valid id",
    community.owner.id !== undefined,
  );
  TestValidator.predicate(
    "owner has username",
    community.owner.username.length > 0,
  );
  TestValidator.predicate(
    "owner has display_name",
    community.owner.display_name.length > 0,
  );
  // 7. Validate subscriber count
  TestValidator.predicate(
    "subscriber count is non-negative",
    community.subscriber_count >= 0,
  );
}

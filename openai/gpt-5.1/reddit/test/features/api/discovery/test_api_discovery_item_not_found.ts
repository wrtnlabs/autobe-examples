import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryItem";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_discovery_item_not_found(
  connection: api.IConnection,
) {
  // 1. Optionally ensure system is healthy by creating a valid discovery item
  //    using the adminUser discovery item creation API. This also gives us a
  //    known existing discovery item ID so that we can generate a distinct
  //    non-existent ID.

  // Admin registration payload
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "AdminPassw0rd!", // string & tags.Format<"password">, realistic strong password
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Create one discovery item as a sanity check that the discovery item
  // creation and retrieval stack is functional. We can point the discovery
  // item at a random UUID as target_id because the ICreate DTO only requires
  // a string, and existence of the target entity is enforced server-side.
  const existingTargetId = typia.random<string & tags.Format<"uuid">>();

  const discoveryCreateBody = {
    target_type: "post",
    target_id: existingTargetId,
    context: "home_feed",
    priority_score: 1.0,
    start_at: new Date().toISOString() as string & tags.Format<"date-time">,
    end_at: undefined,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const existingDiscovery: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: discoveryCreateBody,
      },
    );
  typia.assert(existingDiscovery);

  // 2. Prepare a non-existent discoveryItemId. We generate a fresh UUID and
  //    ensure it does not match the ID of the discovery item we just created.
  let nonExistentDiscoveryItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonExistentDiscoveryItemId === existingDiscovery.id) {
    nonExistentDiscoveryItemId = typia.random<string & tags.Format<"uuid">>();
  }

  // 3. Create an unauthenticated connection clone by clearing headers. We do
  //    not touch the original connection.headers object beyond this shallow
  //    override.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Call GET /communityPlatform/discovery/items/{discoveryItemId} with the
  //    non-existent ID on an unauthenticated connection and assert that it
  //    fails. We do not assert status codes or error payloads, only that an
  //    error is thrown.
  await TestValidator.error(
    "non-existent discovery item should fail for guest",
    async () => {
      await api.functional.communityPlatform.discovery.items.at(
        unauthConnection,
        {
          discoveryItemId: nonExistentDiscoveryItemId,
        },
      );
    },
  );

  // 5. Repeat the same request using the authenticated admin connection to
  //    confirm that behavior is independent of authentication state when the
  //    resource does not exist.
  await TestValidator.error(
    "non-existent discovery item should fail for authenticated admin",
    async () => {
      await api.functional.communityPlatform.discovery.items.at(connection, {
        discoveryItemId: nonExistentDiscoveryItemId,
      });
    },
  );
}

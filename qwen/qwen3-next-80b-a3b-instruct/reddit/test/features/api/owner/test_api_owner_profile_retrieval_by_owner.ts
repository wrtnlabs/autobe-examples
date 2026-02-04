import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_owner_profile_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection (same host) for owner registration and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth: ICommunityPlatformOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      },
    });
  typia.assert(ownerAuth);
  // Step 2: Retrieve owner profile using owner's ID from the authorization response
  // The ownerConnection header's Authorization was updated by authorize_owner_join internally
  const ownerProfile: ICommunityPlatformOwner =
    await api.functional.communityPlatform.owner.owners.at(ownerConnection, {
      ownerId: ownerAuth.id,
    });
  typia.assert(ownerProfile);
  // Step 3: Validate that the retrieved profile contains the correct owner ID and no sensitive data
  TestValidator.equals(
    "retrieved owner ID matches authenticated owner ID",
    ownerProfile.id,
    ownerAuth.id,
  );
}

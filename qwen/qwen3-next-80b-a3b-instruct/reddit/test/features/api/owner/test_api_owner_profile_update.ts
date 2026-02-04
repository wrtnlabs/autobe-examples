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
export async function test_api_owner_profile_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and register first owner
  const registerConnection1: api.IConnection = { host: connection.host };
  const email1: string = typia.random<string & tags.Format<"email">>();
  const registeredOwner1: ICommunityPlatformOwner.IAuthorized =
    await authorize_owner_join(registerConnection1, {
      body: {
        email: email1,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformOwner.IJoin,
    });
  // Step 2: Create a new connection and register second owner
  const registerConnection2: api.IConnection = { host: connection.host };
  const email2: string = typia.random<string & tags.Format<"email">>();
  const registeredOwner2: ICommunityPlatformOwner.IAuthorized =
    await authorize_owner_join(registerConnection2, {
      body: {
        email: email2,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformOwner.IJoin,
    });
  // Step 3: Create owner connections for both owners
  const ownerConnection1: api.IConnection = { host: connection.host };
  ownerConnection1.headers = registerConnection1.headers;
  const ownerConnection2: api.IConnection = { host: connection.host };
  ownerConnection2.headers = registerConnection2.headers;
  // Step 4: Retrieve first owner details to verify registration and get ID
  const initialOwner: ICommunityPlatformOwner =
    await api.functional.communityPlatform.owner.owners.at(ownerConnection1, {
      ownerId: registeredOwner1.id,
    });
  typia.assert(initialOwner);
  // Step 5: Prepare updated profile data for first owner
  const updatedEmail: string = email2; // We'll try to make first owner use second owner's email
  const updatedUsername: string = RandomGenerator.alphaNumeric(12);
  // Step 6: Update the first owner's profile
  const updatedOwner: ICommunityPlatformOwner =
    await api.functional.communityPlatform.owner.owners.update(
      ownerConnection1,
      {
        ownerId: registeredOwner1.id,
        body: {
          email: updatedEmail,
          username: updatedUsername,
        } satisfies ICommunityPlatformOwner.IUpdate,
      },
    );
  typia.assert<ICommunityPlatformOwner>(updatedOwner);
  // Step 7: Validate that email uniqueness constraint is enforced
  // Second owner should be unable to update to use first owner's original email
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.communityPlatform.owner.owners.update(
      ownerConnection2,
      {
        ownerId: registeredOwner2.id,
        body: {
          email: email1, // Try to use first owner's original email
          username: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformOwner.IUpdate,
      },
    );
  });
}

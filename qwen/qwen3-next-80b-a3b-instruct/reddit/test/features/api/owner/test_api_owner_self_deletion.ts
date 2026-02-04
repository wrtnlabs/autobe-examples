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
export async function test_api_owner_self_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and register a new owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const registeredOwner: ICommunityPlatformOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      },
    });
  typia.assert(registeredOwner);
  // Step 2: Delete the owner account using the owner's ID
  await api.functional.communityPlatform.owner.owners.erase(ownerConnection, {
    ownerId: registeredOwner.id,
  });
  // Step 3: Verify that the second deletion attempt returns 404 Not Found
  await TestValidator.httpError(
    "deleting already deleted owner returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.owner.owners.erase(
        ownerConnection,
        {
          ownerId: registeredOwner.id,
        },
      );
    },
  );
}

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
export async function test_api_owner_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the owner registration flow
  const ownerConnection: api.IConnection = { host: connection.host };
  // Generate realistic owner registration credentials
  const ownerEmail: string = typia.random<string & tags.Format<"email">>();
  const ownerPassword: string = RandomGenerator.alphaNumeric(16);
  // Execute owner registration using the provided utility function
  const registrationResult: ICommunityPlatformOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: ownerEmail,
        password: ownerPassword,
      } satisfies ICommunityPlatformOwner.IJoin,
    });
  // Validate the response structure and types - ONLY validation needed
  typia.assert(registrationResult);
}

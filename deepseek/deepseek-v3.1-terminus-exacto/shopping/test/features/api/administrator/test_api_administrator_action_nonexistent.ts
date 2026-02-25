import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_action_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using utility function
  await authorize_administrator_join(adminConnection, {});
  // Generate random UUID that doesn't exist
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent administrative action
  try {
    await api.functional.ecommerce.administrator.administrative_actions.at(
      adminConnection,
      {
        administrativeActionId: nonexistentId,
      },
    );
    // If we reach here, the call succeeded when it should have failed
    throw new Error("Expected to throw but didn't");
  } catch (error) {
    // Verify it's an HttpError with 404 status
    if (!typia.is<api.HttpError>(error)) {
      throw error;
    }
    if (error.status !== 404) {
      throw new Error(`Expected 404 status but got ${error.status}`);
    }
  }
}

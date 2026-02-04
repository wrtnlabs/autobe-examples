import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for administrator registration (isolated from base connection)
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate valid test data meeting requirements
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16); // Minimum 12 characters
  const href = `https://${RandomGenerator.alphaNumeric(12)}.com`;
  const referrer = `https://${RandomGenerator.alphaNumeric(10)}.org`;
  // Perform administrator registration using utility function
  const result: IEconomicDiscussionAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email,
        password,
        href,
        referrer,
      },
    });
  // Validate response structure and types with typia.assert (COMPLETE validation)
  typia.assert(result);
}

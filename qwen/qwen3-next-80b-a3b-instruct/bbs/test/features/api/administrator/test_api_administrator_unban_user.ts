import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_unban_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate administrator using authorization utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "SecurePass123!",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IEconomicDiscussionAdministrator.IJoin,
  });
  // Step 2: Retrieve the list of banned users to establish baseline count
  const initialBannedUsersResponse =
    await api.functional.economicDiscussion.administrator.bans.get(
      adminConnection,
    );
  typia.assert(initialBannedUsersResponse);
  // Ensure we have at least one banned user for testing
  // Since there's no ban API provided, we assume the system has at least one banned user
  // (as required for testing unban functionality)
  if (initialBannedUsersResponse.data.length === 0) {
    // Test cannot proceed without a banned user
    throw new Error(
      "No banned users found. Test requires at least one banned user to unban.",
    );
  }
  // Record initial count
  const initialCount = initialBannedUsersResponse.data.length;
  // Step 3: Perform the unban action (calls POST /economicDiscussion/administrator/unbans)
  // Note: The API function takes no parameters as defined in the provided SDK
  await api.functional.economicDiscussion.administrator.unbans.unban(
    adminConnection,
  );
  // Step 4: Validate unbanning success by retrieving updated banned users list
  const updatedBannedUsersResponse =
    await api.functional.economicDiscussion.administrator.bans.get(
      adminConnection,
    );
  typia.assert(updatedBannedUsersResponse);
  // Verify that the count of banned users decreased by one
  // This confirms that an unban operation was performed and took effect
  TestValidator.equals(
    "banned users count decreased by one",
    updatedBannedUsersResponse.data.length,
    initialCount - 1,
  );
}

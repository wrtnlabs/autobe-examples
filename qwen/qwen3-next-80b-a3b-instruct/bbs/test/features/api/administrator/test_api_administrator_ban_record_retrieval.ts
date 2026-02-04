import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_ban_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconomicDiscussionAdministrator.IJoin;
  const admin: IEconomicDiscussionAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: adminJoinInput,
    });
  typia.assert(admin);
  // Step 2: Generate a valid UUID format to test the API can accept it
  // (This might be a real ban ID if created in system, or just a valid format)
  const validBanId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Test that administrator can retrieve ban record with valid UUID format
  const retrievedBan: IEconomicDiscussionBan =
    await api.functional.economicDiscussion.administrator.bans.at(
      adminConnection,
      { banId: validBanId },
    );
  typia.assert(retrievedBan);
  // Step 4: Validate that the returned record has the minimum required properties
  // We cannot guarantee the contents (since we can't create records),
  // but we can validate that the type structure is correct via typia.assert
  // which validates all IEconomicDiscussionBan fields including:
  // - affected_user.id (UUID)
  // - issuing_admin.id (UUID)
  // - ban_id (UUID)
  // - reason (string with min 10, max 500)
  // - created_at (date-time)
  // - updated_at (date-time)
  // This is performed by typia.assert above
  // Step 5: Test with a clearly invalid UUID format
  await TestValidator.error(
    "invalid UUID format should return 404",
    async () => {
      await api.functional.economicDiscussion.administrator.bans.at(
        adminConnection,
        { banId: "invalid_uuid" },
      );
    },
  );
  // Step 6: Test that a non-existent but well-formed ban ID returns 404
  // This is the most common error scenario
  await TestValidator.error(
    "non-existent ban ID should return 404",
    async () => {
      await api.functional.economicDiscussion.administrator.bans.at(
        adminConnection,
        {
          banId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}

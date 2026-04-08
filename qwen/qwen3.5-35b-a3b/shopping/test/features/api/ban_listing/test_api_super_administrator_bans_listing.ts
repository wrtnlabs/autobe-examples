import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_bans_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const registration = await authorize_super_administrator_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      },
    },
  );
  typia.assert(registration);
  // 2. Create connection with token from registration
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    ...authConnection.headers,
    Authorization: registration.token.access,
  };
  // 3. Call ban listing endpoint with default parameters
  const bansResponse =
    await api.functional.ecommerceMall.superAdministrator.bans.index(
      authConnection,
      {
        body: {},
      },
    );
  typia.assert(bansResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    bansResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", bansResponse.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count matches data array",
    bansResponse.pagination.records,
    bansResponse.data.length,
  );
  TestValidator.equals(
    "pagination total pages",
    bansResponse.pagination.pages,
    bansResponse.data.length === 0
      ? 0
      : Math.ceil(bansResponse.data.length / 20),
  );
  // 5. Validate ban record structure (if any bans exist)
  if (bansResponse.data.length > 0) {
    const firstBan = bansResponse.data[0];
    typia.assert(firstBan);
    // Verify ban has required fields with correct types (validated by typia.assert)
    const banId: string = firstBan.id;
    const userType: "customer" | "seller" = firstBan.user_type;
    const reason: string = firstBan.reason;
    const bannedAt: string = firstBan.banned_at;
    const createdAt: string = firstBan.created_at;
    const updatedAt: string = firstBan.updated_at;
    const banStatus: "active" | "completed" = firstBan.ban_status;
    const administratorId: string = firstBan.administrator.id;
    const administratorDisplayName: string = firstBan.administrator.displayName;
    const administratorEmail: string = firstBan.administrator.email;
    // Verify sorting: first ban should have most recent created_at (default descending)
    if (bansResponse.data.length > 1) {
      const secondBan = bansResponse.data[1];
      TestValidator.equals(
        "bans sorted by created_at descending",
        firstBan.created_at >= secondBan.created_at,
        true,
      );
    }
  } else {
    // 6. Validate empty list scenario
    TestValidator.equals(
      "empty list pagination records",
      bansResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty list pagination pages",
      bansResponse.pagination.pages,
      0,
    );
  }
}

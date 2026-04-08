import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account first (dependency requirement)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Test scenario 1: Completely fake/invalid token string
  await TestValidator.error("fake token should return 401", async () => {
    const fakeConnection: api.IConnection = { host: connection.host };
    await api.functional.erpHrm.auth.admin.refresh(fakeConnection, {
      body: {
        refreshToken: "this.is.completely.fake.token",
      },
    });
  });
  // Test scenario 2: Invalid JWT structure (not base64-encoded JSON in payload)
  await TestValidator.error("malformed JWT should return 401", async () => {
    const fakeConnection: api.IConnection = { host: connection.host };
    await api.functional.erpHrm.auth.admin.refresh(fakeConnection, {
      body: {
        refreshToken: "invalid.jwt.format.abc123",
      },
    });
  });
  // Test scenario 3: Token with invalid base64 padding
  await TestValidator.error(
    "invalid base64 padding should return 401",
    async () => {
      const fakeConnection: api.IConnection = { host: connection.host };
      await api.functional.erpHrm.auth.admin.refresh(fakeConnection, {
        body: {
          refreshToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalidbase64padding",
        },
      });
    },
  );
  // Test scenario 4: Empty string token
  await TestValidator.error("empty token should return 401", async () => {
    const fakeConnection: api.IConnection = { host: connection.host };
    await api.functional.erpHrm.auth.admin.refresh(fakeConnection, {
      body: {
        refreshToken: "",
      },
    });
  });
  // Test scenario 5: Token with wrong signature key
  await TestValidator.error(
    "wrong signature key should return 401",
    async () => {
      const fakeConnection: api.IConnection = { host: connection.host };
      // Using a valid JWT structure but with wrong signature
      await api.functional.erpHrm.auth.admin.refresh(fakeConnection, {
        body: {
          refreshToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.wrong_signature_key_here",
        },
      });
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityCryptoKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCryptoKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_crypto_key_rotation_to_deprecated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login to gain authorization for key management
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Create an active cryptographic key for rotation
  const keyMaterial = ArrayUtil.repeat(384, () =>
    RandomGenerator.alphaNumeric(1),
  ).join("");
  const activeKey = await api.functional.community.admin.crypto_keys.update(
    adminConnection,
    {
      keyId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        key_value: btoa(keyMaterial),
        key_type: "rsa",
        algorithm: "RSA-3072",
        status: "active",
        key_metadata: { version: "v1.0", issuer: "original-system" },
      } satisfies ICommunityCryptoKey,
    },
  );
  typia.assert(activeKey);
  // 3. Rotate key: update the active key to deprecated status with new key material
  const rotatedKey = await api.functional.community.admin.crypto_keys.update(
    adminConnection,
    {
      keyId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        key_value: btoa(keyMaterial),
        key_type: "rsa",
        algorithm: "RSA-3072",
        status: "deprecated",
        key_metadata: { version: "v3.0", issuer: "rotated-system" },
      } satisfies ICommunityCryptoKey,
    },
  );
  typia.assert(rotatedKey);
}

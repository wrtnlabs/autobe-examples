import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_creates_identity_per_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Ensure different device fingerprints
  const deviceFingerprintA = `df_${RandomGenerator.alphabets(16)}`;
  let deviceFingerprintB = `df_${RandomGenerator.alphabets(16)}`;
  while (deviceFingerprintB === deviceFingerprintA) {
    deviceFingerprintB = `df_${RandomGenerator.alphabets(16)}`;
  }
  const guestConnectionA: api.IConnection = { host: connection.host };
  const authA = await authorize_guest_join(guestConnectionA, {
    body: {
      deviceFingerprint: deviceFingerprintA,
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(authA);
  const guestConnectionB: api.IConnection = { host: connection.host };
  const authB = await authorize_guest_join(guestConnectionB, {
    body: {
      deviceFingerprint: deviceFingerprintB,
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(authB);
  TestValidator.notEquals(
    "guest identity should differ per device fingerprint",
    authA.id,
    authB.id,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_duplicate_device_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. First registration with device_id 'test-device-001'
  const firstDeviceId = typia.random<string & tags.Format<"uuid">>();
  const firstConnection: api.IConnection = { host: connection.host };
  const firstGuest = await authorize_guest_join(firstConnection, {
    body: {
      device_id: firstDeviceId,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      user_agent: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(firstGuest);
  // 2. Attempt second registration with same device_id but different IP and user_agent
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate device_id should fail", async () => {
    await api.functional.todoApp.auth.guest.join(secondConnection, {
      body: {
        device_id: firstDeviceId,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        user_agent: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppGuest.IJoin,
    });
  });
  // 3. Verify existing guest account remains unchanged
  const verifyConnection: api.IConnection = { host: connection.host };
  const existingGuest = await api.functional.todoApp.auth.guest.join(
    verifyConnection,
    {
      body: {
        device_id: firstDeviceId,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        user_agent: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppGuest.IJoin,
    },
  );
  typia.assert(existingGuest);
  TestValidator.equals(
    "existing guest account unchanged",
    existingGuest.id,
    firstGuest.id,
  );
}

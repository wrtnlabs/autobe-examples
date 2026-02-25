import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_registration_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for guest registration
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate valid test data for guest registration
  const joinInput = {
    device_fingerprint: RandomGenerator.alphaNumeric(32),
    ip_address: RandomGenerator.pick([
      "192.168.1.1",
      "10.0.0.1",
      "172.16.0.1",
      "8.8.8.8",
    ]),
  } satisfies IDiscussionBoardGuest.IJoin;
  // Register guest and receive authorized response
  const output: IDiscussionBoardGuest.IAuthorized =
    await api.functional.discussionBoard.auth.guest.join(guestConnection, {
      body: joinInput,
    });
  // Complete runtime validation using typia
  typia.assert(output);
}

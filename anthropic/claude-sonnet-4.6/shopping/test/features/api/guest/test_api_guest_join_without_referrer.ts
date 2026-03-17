import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_without_referrer(
  connection: api.IConnection,
): Promise<void> {
  // Create a fresh guest connection (do not use base connection directly)
  const guestConnection: api.IConnection = { host: connection.host };
  // Prepare explicit join body with empty referrer
  const fingerprint = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Call authorize_guest_join utility with explicit body including empty referrer
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      token: fingerprint,
      href: href,
      referrer: "",
      ip: ip,
    },
  });
  // Validate overall response shape
  typia.assert(authorized);
  // Validate the session's referrer is stored as empty string
  const sessions = authorized.guest.sessions;
  TestValidator.predicate(
    "guest has at least one session",
    sessions.length > 0,
  );
  const session = sessions[0]!;
  TestValidator.equals(
    "session referrer is empty string",
    session.referrer,
    "",
  );
  // Validate the session's href matches the submitted href
  TestValidator.equals(
    "session href matches submitted href",
    session.href,
    href,
  );
}

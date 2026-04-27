import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_duplicate_email_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Phase 1: First registration (setup)
  const email = "existing.user@example.com";
  const password1 = RandomGenerator.alphaNumeric(16);
  const href1 = typia.random<string & tags.Format<"uri">>();
  const referrer1 = typia.random<string & tags.Format<"uri">>();
  const ip1 = typia.random<string & tags.Format<"ipv4">>();
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAuth = await authorize_guest_join(firstConnection, {
    body: {
      email,
      password: password1,
      href: href1,
      referrer: referrer1,
      ip: ip1,
    },
  });
  typia.assert(firstAuth);
  // Phase 2: Attempt duplicate registration with the same email
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("duplicate email rejection", 409, async () => {
    await api.functional.hrmTimeTracking.auth.guest.join(secondConnection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmTimeTrackingGuest.IJoin,
    });
  });
}

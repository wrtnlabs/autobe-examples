import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_creation(
  connection: api.IConnection,
): Promise<void> {
  const session = await authorize_guest_join(connection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      ip: RandomGenerator.mobile(),
      href: "https://example.com/guest",
      referrer: "https://example.com",
    } satisfies IEconPoliticBoardGuest.IJoin,
  });
  typia.assert(session);
  TestValidator.equals(
    "session ID should be valid UUID",
    session.id,
    session.id,
  );
  TestValidator.equals(
    "access token should be defined",
    session.token.access,
    session.token.access,
  );
  TestValidator.equals(
    "refresh token should be defined",
    session.token.refresh,
    session.token.refresh,
  );
}

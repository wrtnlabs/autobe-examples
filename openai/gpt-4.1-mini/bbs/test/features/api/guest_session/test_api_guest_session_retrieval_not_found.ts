import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // This test checks the retrieval of a non-existent registered user session by a guest.
  // 1. Authenticate as guest using the provided utility function.
  // 2. Attempt to fetch session details using a random UUID not in DB.
  // 3. Expect HTTP 404 error and verify error does not leak sensitive info.
  // 1. Obtain guest authorization
  const guestConnection: api.IConnection = { host: connection.host };
  const guestJoinBody: IDiscussionBoardGuest.IJoin = {
    deviceFingerprint: RandomGenerator.alphaNumeric(20),
    userAgent: "Mozilla/5.0 (compatible; TestAgent/1.0)",
    ipAddress: "127.0.0.1",
    anonymousId: RandomGenerator.alphaNumeric(10),
  };
  await authorize_guest_join(guestConnection, { body: guestJoinBody });
  // 2. Attempt to retrieve a non-existent session
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect error
  await TestValidator.httpError(
    "guest session retrieval - non-existent session returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.guest.sessions.at(guestConnection, {
        sessionId: fakeSessionId,
      });
    },
  );
}

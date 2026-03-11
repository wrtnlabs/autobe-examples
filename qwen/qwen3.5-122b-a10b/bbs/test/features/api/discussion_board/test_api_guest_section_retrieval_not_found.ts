import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_section_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and join as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth: IDiscussionBoardGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        deviceFingerprint: RandomGenerator.alphaNumeric(32),
      } satisfies IDiscussionBoardGuest.IJoin,
    });
  typia.assert(guestAuth);
  // 2. Generate a valid UUID that doesn't exist in database
  const nonExistentSectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent section and validate 404 error
  await TestValidator.httpError(
    "non-existent section returns 404",
    404,
    async () =>
      await api.functional.discussionBoard.guest.sections.at(guestConnection, {
        sectionId: nonExistentSectionId,
      }),
  );
}

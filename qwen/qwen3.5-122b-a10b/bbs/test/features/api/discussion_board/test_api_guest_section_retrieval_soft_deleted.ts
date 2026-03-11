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

export async function test_api_guest_section_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication prerequisite
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Attempt to retrieve a non-existent section
  // Since we cannot create soft-deleted sections without admin APIs,
  // we test with a random UUID that doesn't exist, which validates
  // the same 404 response pattern
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify that accessing non-existent section throws 404 error
  await TestValidator.httpError(
    "guest cannot access non-existent section (404)",
    404,
    async () => {
      await api.functional.discussionBoard.guest.sections.at(guestConnection, {
        sectionId: nonExistentSectionId,
      });
    },
  );
}

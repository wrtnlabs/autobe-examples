import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that retrieving a non-existent section returns 404 Not Found.
 * The test should: 1. Authenticate as an admin via /discussionBoard/auth/admin/join. 2. Generate a valid UUID that does not correspond to any existing section. 3. Attempt to retrieve the non-existent section using GET /discussionBoard/admin/sections/{sectionId} with the invalid UUID. 4. Validate the response returns HTTP 404 Not Found status. 5. Verify the error response indicates the section was not found. This validates proper handling of requests for sections that have never been created, distinguishing from soft-deleted sections while returning the same 404 response.
 */
export async function test_api_section_not_found_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate a valid UUID that does not correspond to any existing section
  const nonExistentSectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Attempt to retrieve the non-existent section and validate 404 error
  await TestValidator.httpError(
    "section not found returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.sections.at(adminConnection, {
        sectionId: nonExistentSectionId,
      });
    },
  );
}

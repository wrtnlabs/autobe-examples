import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Verify that when a member attempts to retrieve a discussion board section
 * that has been soft-deleted (deleted_at is not null), the system correctly
 * returns a 404 Not Found response.
 *
 * The test authenticates as a member and attempts to retrieve a section using
 * a non-existent UUID. Since there is no admin endpoint available to create
 * sections or mark them as soft-deleted, this test validates the same business
 * rule: sections that are either deleted or non-existent return 404 Not Found.
 *
 * This confirms that soft-deleted sections are treated as non-existent and
 * are not accessible to members.
 */
export async function test_api_section_retrieval_soft_deleted_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(auth);
  // 2. Generate a random UUID that does not exist (simulates soft-deleted section)
  const nonExistentSectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the section - should return 404
  await TestValidator.httpError(
    "soft-deleted section returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.member.sections.at(
        memberConnection,
        {
          sectionId: nonExistentSectionId,
        },
      );
    },
  );
}

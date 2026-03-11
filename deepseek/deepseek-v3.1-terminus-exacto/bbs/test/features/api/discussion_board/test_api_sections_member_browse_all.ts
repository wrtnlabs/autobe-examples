import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_sections_member_browse_all(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Register and authenticate member using utility function
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Browse sections using member connection
  const sections =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
    );
  typia.assert(sections);
  // Validate pagination metadata has valid values
  TestValidator.predicate(
    "pagination current page >= 0",
    sections.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    sections.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    sections.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    sections.pagination.pages >= 0,
  );
  // Validate sections are returned in alphabetical order by name
  if (sections.data.length > 1) {
    for (let i = 1; i < sections.data.length; i++) {
      const currentName = sections.data[i].name.toLowerCase();
      const previousName = sections.data[i - 1].name.toLowerCase();
      TestValidator.predicate(
        `section ${i} should be alphabetically after section ${i - 1}`,
        currentName >= previousName,
      );
    }
  }
  // Validate that pagination metadata is consistent
  if (sections.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculated correctly",
      sections.pagination.pages ===
        Math.ceil(sections.pagination.records / sections.pagination.limit),
    );
  }
}

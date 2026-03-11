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

export async function test_api_sections_member_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
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
  // Test basic section retrieval to ensure API is working
  const sections =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
    );
  typia.assert(sections);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination data",
    sections.pagination !== undefined,
  );
  TestValidator.predicate("has sections array", Array.isArray(sections.data));
  // Note: The current API endpoint does not support filtering parameters in the request.
  // The scenario describes filtering capabilities but the provided SDK function
  // (api.functional.discussionBoard.member.sections.index) does not accept any
  // parameters for filtering, searching, or sorting.
  // Since the API function signature doesn't support filtering parameters,
  // we can only test the basic functionality of retrieving all sections
  // Test that response contains valid section summaries
  if (sections.data.length > 0) {
    const section = sections.data[0];
    TestValidator.predicate("section has id", typeof section.id === "string");
    TestValidator.predicate(
      "section has name",
      typeof section.name === "string",
    );
    TestValidator.predicate(
      "section has created_at",
      typeof section.created_at === "string",
    );
    // Validate UUID format
    TestValidator.predicate(
      "section id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        section.id,
      ),
    );
    // Validate date-time format
    TestValidator.predicate(
      "created_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(section.created_at),
    );
  }
  // Test pagination properties
  TestValidator.predicate(
    "pagination has current page",
    sections.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    sections.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    sections.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    sections.pagination.pages >= 0,
  );
  // The filtering and search capabilities described in the scenario cannot be tested
  // with the current API function as it doesn't accept any parameters for filtering
}

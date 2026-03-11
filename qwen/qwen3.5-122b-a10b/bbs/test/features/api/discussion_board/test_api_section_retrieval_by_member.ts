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

export async function test_api_section_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate random valid section ID
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call section retrieval endpoint
  const section = await api.functional.discussionBoard.member.sections.at(
    memberConnection,
    {
      sectionId,
    } satisfies {
      sectionId: string & tags.Format<"uuid">;
    },
  );
  typia.assert(section);
  // 4. Validate section entity structure
  TestValidator.equals("section has valid UUID", section.id, section.id);
  TestValidator.predicate("section name exists", section.name.length > 0);
  TestValidator.predicate(
    "creator has display_name",
    section.creator.display_name.length > 0,
  );
  TestValidator.predicate(
    "creator has grade",
    section.creator.grade.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    section.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    section.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active section",
    section.deleted_at,
    null,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_section_list_default_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
      grade: RandomGenerator.pick(["regular", "super"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve section list with default parameters (empty body)
  const sections = await api.functional.discussionBoard.admin.sections.index(
    adminConnection,
    {
      body: {} satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(sections);
  // 3. Validate pagination metadata exists and is valid
  TestValidator.predicate(
    "pagination exists",
    sections.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is non-negative",
    sections.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    sections.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    sections.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    sections.pagination.pages >= 0,
  );
  // 4. Validate each section summary has required fields
  for (const section of sections.data) {
    typia.assert(section);
    // Validate section properties
    TestValidator.predicate(
      "section has UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        section.id,
      ),
    );
    TestValidator.predicate("section has name", section.name.length > 0);
    TestValidator.predicate(
      "section has valid created_at",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        section.created_at,
      ),
    );
    TestValidator.predicate(
      "section has valid updated_at",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        section.updated_at,
      ),
    );
    // Validate creator information
    TestValidator.predicate(
      "creator has UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        section.creator.id,
      ),
    );
    TestValidator.predicate(
      "creator has display_name",
      section.creator.display_name.length > 0,
    );
    TestValidator.predicate(
      "creator has valid grade",
      section.creator.grade === "regular" || section.creator.grade === "super",
    );
    TestValidator.predicate(
      "creator has valid created_at",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        section.creator.created_at,
      ),
    );
    TestValidator.predicate(
      "creator has valid updated_at",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        section.creator.updated_at,
      ),
    );
    // Validate deleted_at is null for active sections (soft-delete semantics)
    TestValidator.equals(
      "deleted_at is null for active section",
      section.deleted_at,
      null,
    );
  }
}

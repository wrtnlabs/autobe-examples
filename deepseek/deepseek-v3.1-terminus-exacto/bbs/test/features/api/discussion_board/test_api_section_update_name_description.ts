import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_update_name_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorizedSuperAdmin);
  // 2. Create initial section
  const initialSection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(initialSection);
  // 3. Create another section to test duplicate name constraint
  const anotherSection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(anotherSection);
  // 4. Test partial update - only name and description
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  // Proper type conversion for tagged types
  const updateBody: IDiscussionBoardSection.IUpdate = {
    name: updatedName,
    description: updatedDescription,
  };
  const updatedSection =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: initialSection.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSection);
  // 5. Validate partial update results
  TestValidator.equals(
    "section id unchanged",
    updatedSection.id,
    initialSection.id,
  );
  TestValidator.equals("name updated", updatedSection.name, updatedName);
  TestValidator.equals(
    "description updated",
    updatedSection.description,
    updatedDescription,
  );
  TestValidator.equals(
    "status unchanged",
    updatedSection.status,
    initialSection.status,
  );
  TestValidator.equals(
    "display_order unchanged",
    updatedSection.display_order,
    initialSection.display_order,
  );
  TestValidator.equals(
    "createdByAdmin unchanged",
    updatedSection.createdByAdmin.id,
    initialSection.createdByAdmin.id,
  );
  TestValidator.predicate(
    "lastModifiedByAdmin set",
    updatedSection.lastModifiedByAdmin !== null,
  );
  // 6. Test duplicate name constraint
  await TestValidator.error("duplicate section name", async () => {
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: initialSection.id,
        body: {
          name: anotherSection.name,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  });
  // 7. Verify only superAdmin can update sections
  const nonAdminConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "non-superAdmin cannot update sections",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.update(
        nonAdminConnection,
        {
          sectionId: initialSection.id,
          body: {
            name: "Unauthorized Update",
          } satisfies IDiscussionBoardSection.IUpdate,
        },
      );
    },
  );
}

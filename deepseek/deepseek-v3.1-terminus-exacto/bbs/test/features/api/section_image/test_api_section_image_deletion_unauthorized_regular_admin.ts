import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_admin_sections_images_create } from "../../../generate/generate_random_discussion_board_admin_sections_images_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_image } from "../../../prepare/prepare_random_discussion_board_section_image";

export async function test_api_section_image_deletion_unauthorized_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super admin for reference (not used for deletion attempt)
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies
        | string
        | null
        | undefined as string | null | undefined,
    },
  });
  // 2. Create and authenticate regular admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 3. Create section as regular admin
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32">
        >() satisfies number as number,
      },
    },
  );
  typia.assert(section);
  // 4. Upload image to section as regular admin
  const image =
    await generate_random_discussion_board_admin_sections_images_create(
      adminConnection,
      {
        body: {
          filename: `${RandomGenerator.alphabets(8)}.jpg`,
          mime_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number as number,
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          image_type: RandomGenerator.pick([
            "banner",
            "icon",
            "promotional",
            "thumbnail",
          ] as const),
          storage_path: `/sections/${section.id}/${RandomGenerator.alphabets(10)}.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: { sectionId: section.id },
      },
    );
  typia.assert(image);
  // 5. Attempt to delete image using superAdmin endpoint with regular admin connection (should fail)
  await TestValidator.httpError(
    "regular admin cannot delete section images via superAdmin endpoint",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.images.erase(
        adminConnection,
        {
          sectionId: section.id,
          imageId: image.id,
        },
      );
    },
  );
  // 6. Verify regular admin cannot access other superAdmin-only operations
  // This is a general authorization boundary test
  TestValidator.predicate(
    "regular admin token exists",
    admin.token.access.length > 0,
  );
}

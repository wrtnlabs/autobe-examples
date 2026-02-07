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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_images_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_images_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_image } from "../../../prepare/prepare_random_discussion_board_section_image";

export async function test_api_section_image_creation_banner_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create banner image for the section
  const bannerImage =
    await generate_random_discussion_board_super_admin_sections_images_create(
      superAdminConnection,
      {
        body: {
          filename: "section-banner.jpg",
          mime_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<50000> &
              tags.Maximum<2000000>
          >(),
          width: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1200> &
              tags.Maximum<1920>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<300> & tags.Maximum<800>
          >(),
          image_type: "banner",
          storage_path: `/uploads/sections/${section.id}/banner.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(bannerImage);
  // 4. Validate the image record
  TestValidator.equals(
    "image type should be banner",
    bannerImage.image_type,
    "banner",
  );
  TestValidator.equals(
    "section ID should match",
    bannerImage.section.id,
    section.id,
  );
  TestValidator.predicate(
    "filename should be populated",
    bannerImage.filename.length > 0,
  );
  TestValidator.predicate(
    "mime type should be populated",
    bannerImage.mime_type.length > 0,
  );
  TestValidator.predicate(
    "file size should be positive",
    bannerImage.file_size > 0,
  );
  TestValidator.predicate("width should be positive", bannerImage.width > 0);
  TestValidator.predicate("height should be positive", bannerImage.height > 0);
  TestValidator.predicate(
    "storage path should be populated",
    bannerImage.storage_path.length > 0,
  );
  TestValidator.predicate(
    "alt text should be present",
    bannerImage.alt_text !== null && bannerImage.alt_text.length > 0,
  );
}

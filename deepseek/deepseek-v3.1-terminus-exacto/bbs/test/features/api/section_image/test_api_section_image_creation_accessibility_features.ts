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

export async function test_api_section_image_creation_accessibility_features(
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
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Upload image with detailed alt text
  const imageWithAltText =
    await generate_random_discussion_board_super_admin_sections_images_create(
      superAdminConnection,
      {
        body: {
          filename: "accessible-image.jpg",
          mime_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<2000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<2000>
          >(),
          image_type: "banner" as const,
          storage_path:
            "/images/section-banners/" +
            typia.random<string & tags.Format<"uuid">>(),
          alt_text:
            "A detailed description of the section banner image showing various discussion topics",
        } satisfies IDiscussionBoardSectionImage.ICreate,
        params: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(imageWithAltText);
  // 4. Upload image with null alt text
  const imageWithNullAltText =
    await generate_random_discussion_board_super_admin_sections_images_create(
      superAdminConnection,
      {
        body: {
          filename: "decorative-image.png",
          mime_type: "image/png",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<500> &
              tags.Maximum<2000000>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<500>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<500>
          >(),
          image_type: "icon" as const,
          storage_path:
            "/images/section-icons/" +
            typia.random<string & tags.Format<"uuid">>(),
          alt_text: null,
        } satisfies IDiscussionBoardSectionImage.ICreate,
        params: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(imageWithNullAltText);
  // 5. Validate accessibility features
  TestValidator.equals(
    "image with alt text should store alt text correctly",
    imageWithAltText.alt_text,
    "A detailed description of the section banner image showing various discussion topics",
  );
  TestValidator.equals(
    "image with null alt text should store null correctly",
    imageWithNullAltText.alt_text,
    null,
  );
  TestValidator.notEquals(
    "images should have different IDs",
    imageWithAltText.id,
    imageWithNullAltText.id,
  );
  TestValidator.equals(
    "both images should belong to the same section",
    imageWithAltText.section.id,
    section.id,
  );
  TestValidator.equals(
    "null alt text image should belong to the same section",
    imageWithNullAltText.section.id,
    section.id,
  );
  TestValidator.predicate(
    "image with alt text should have valid dimensions",
    imageWithAltText.width > 0 && imageWithAltText.height > 0,
  );
  TestValidator.predicate(
    "image with null alt text should have valid dimensions",
    imageWithNullAltText.width > 0 && imageWithNullAltText.height > 0,
  );
}

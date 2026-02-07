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

/**
 * Test creating different image types (banner, icon, promotional, thumbnail) for the same section.
 * Authenticate as super administrator, create a section, then upload multiple images with different
 * types to demonstrate section branding versatility. Validate that each image type is correctly
 * stored with appropriate metadata and that the section can support multiple visual assets for
 * different purposes. Verify that image records maintain their type-specific properties and are
 * properly associated with the section.
 */
export async function test_api_section_image_creation_multiple_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 1,
            wordMax: 3,
          }),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Define image types to create - use proper type assertion
  const imageTypes: Array<"banner" | "icon" | "promotional" | "thumbnail"> = [
    "banner",
    "icon",
    "promotional",
    "thumbnail",
  ];
  // 4. Create images for each type
  const createdImages: IDiscussionBoardSectionImage[] = [];
  for (const imageType of imageTypes) {
    const image =
      await generate_random_discussion_board_super_admin_sections_images_create(
        superAdminConnection,
        {
          params: {
            sectionId: section.id,
          },
          body: {
            filename: `${imageType}_${RandomGenerator.alphabets(8)}.png`,
            mime_type: "image/png",
            file_size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1000> &
                tags.Maximum<5000000>
            >(),
            width: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<100> &
                tags.Maximum<2000>
            >(),
            height: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<100> &
                tags.Maximum<2000>
            >(),
            image_type: imageType,
            storage_path: `/sections/${section.id}/${imageType}_${RandomGenerator.alphabets(12)}.png`,
            alt_text: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 3,
              wordMax: 8,
            }),
          } satisfies IDiscussionBoardSectionImage.ICreate,
        },
      );
    typia.assert(image);
    createdImages.push(image);
  }
  // 5. Validate each image has correct properties
  TestValidator.equals("created four images", createdImages.length, 4);
  for (let i = 0; i < createdImages.length; i++) {
    const image = createdImages[i];
    const expectedType = imageTypes[i];
    TestValidator.equals(
      `image ${i} has correct type`,
      image.image_type,
      expectedType,
    );
    TestValidator.equals(
      `image ${i} has correct section association`,
      image.section.id,
      section.id,
    );
    TestValidator.predicate(
      `image ${i} has valid file size`,
      image.file_size > 0,
    );
    TestValidator.predicate(
      `image ${i} has valid dimensions`,
      image.width > 0 && image.height > 0,
    );
    TestValidator.predicate(
      `image ${i} has filename`,
      image.filename.length > 0,
    );
    TestValidator.predicate(
      `image ${i} has storage path`,
      image.storage_path.length > 0,
    );
    TestValidator.predicate(
      `image ${i} has valid mime type`,
      image.mime_type.startsWith("image/"),
    );
  }
  // 6. Verify all image types are distinct
  const uniqueTypes = new Set(createdImages.map((img) => img.image_type));
  TestValidator.equals("all image types are unique", uniqueTypes.size, 4);
}

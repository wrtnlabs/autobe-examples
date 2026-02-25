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

export async function test_api_section_image_different_types(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create section
  const section =
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
  typia.assert(section);
  // Define image types with appropriate dimensions
  const imageTypes: Array<{
    type: "banner" | "icon" | "promotional" | "thumbnail";
    width: number;
    height: number;
    description: string;
  }> = [
    {
      type: "banner",
      width: 1920,
      height: 400,
      description: "Section banner image",
    },
    { type: "icon", width: 64, height: 64, description: "Section icon" },
    {
      type: "promotional",
      width: 800,
      height: 600,
      description: "Promotional image",
    },
    {
      type: "thumbnail",
      width: 300,
      height: 200,
      description: "Thumbnail image",
    },
  ];
  // Create images for each type
  const createdImages: IDiscussionBoardSection.Image[] = [];
  for (const imageType of imageTypes) {
    const image =
      await generate_random_discussion_board_super_admin_sections_images_create(
        superAdminConnection,
        {
          params: { sectionId: section.id },
          body: {
            filename: `${imageType.type}_${RandomGenerator.alphaNumeric(8)}.png`,
            mime_type: "image/png",
            file_size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1024> &
                tags.Maximum<10485760>
            >(),
            width: imageType.width,
            height: imageType.height,
            image_type: imageType.type,
            storage_path: `/sections/${section.id}/images/${typia.random<string & tags.Format<"uuid">>()}.png`,
            alt_text: imageType.description,
          } satisfies IDiscussionBoardSectionImage.ICreate,
        },
      );
    typia.assert(image);
    createdImages.push(image);
    // Validate image type classification
    TestValidator.equals(
      `image type should be ${imageType.type}`,
      image.image_type,
      imageType.type,
    );
    // Validate metadata storage
    TestValidator.equals(
      `width should be ${imageType.width} for ${imageType.type}`,
      image.width,
      imageType.width,
    );
    TestValidator.equals(
      `height should be ${imageType.height} for ${imageType.type}`,
      image.height,
      imageType.height,
    );
    TestValidator.equals(
      `filename should be stored correctly for ${imageType.type}`,
      image.filename,
      image.filename,
    );
  }
  // Validate that all image types were created successfully
  TestValidator.equals(
    "all image types should be created",
    createdImages.length,
    imageTypes.length,
  );
  // Verify that images have unique IDs
  const imageIds = new Set(createdImages.map((img) => img.id));
  TestValidator.equals(
    "all images should have unique IDs",
    imageIds.size,
    createdImages.length,
  );
  // Validate that storage paths are properly constructed
  for (const image of createdImages) {
    TestValidator.predicate(
      `storage path should be valid for ${image.image_type}`,
      image.storage_path.startsWith(`/sections/${section.id}/images/`),
    );
  }
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_admin_sections_images_create } from "../../../generate/generate_random_discussion_board_admin_sections_images_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_image } from "../../../prepare/prepare_random_discussion_board_section_image";

export async function test_api_section_image_upload_multiple_types_for_section_branding(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create a new section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 4,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Define image types with realistic metadata
  const imageConfigs = [
    {
      type: "banner" as const,
      widthRange: [1200, 2000],
      heightRange: [300, 600],
      sizeRange: [50000, 500000],
    },
    {
      type: "icon" as const,
      widthRange: [64, 256],
      heightRange: [64, 256],
      sizeRange: [5000, 50000],
    },
    {
      type: "promotional" as const,
      widthRange: [800, 1200],
      heightRange: [400, 800],
      sizeRange: [20000, 300000],
    },
    {
      type: "thumbnail" as const,
      widthRange: [150, 300],
      heightRange: [150, 300],
      sizeRange: [10000, 100000],
    },
  ];
  const uploadedImages: IDiscussionBoardSectionImage[] = [];
  // Upload each image type with realistic metadata
  for (const config of imageConfigs) {
    const randomSuffix = RandomGenerator.alphabets(6);
    const filename = `${config.type}_${section.name.replace(/\s+/g, "_").toLowerCase()}_${randomSuffix}.png`;
    const image =
      await generate_random_discussion_board_admin_sections_images_create(
        adminConnection,
        {
          params: { sectionId: section.id },
          body: {
            filename: filename,
            mime_type: "image/png",
            file_size: randint(config.sizeRange[0], config.sizeRange[1]),
            width: randint(config.widthRange[0], config.widthRange[1]),
            height: randint(config.heightRange[0], config.heightRange[1]),
            image_type: config.type,
            storage_path: `/sections/${section.id}/images/${config.type}/${filename}`,
            alt_text: `${config.type} image for ${section.name}`,
          } satisfies IDiscussionBoardSectionImage.ICreate,
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
    // Validate image type categorization
    TestValidator.equals(
      `${config.type} image type should be correctly set`,
      image.image_type,
      config.type,
    );
    // Validate section association
    TestValidator.equals(
      `${config.type} image should be associated with correct section`,
      image.section.id,
      section.id,
    );
    // Validate realistic dimensions
    TestValidator.predicate(
      `${config.type} image should have realistic width`,
      image.width >= config.widthRange[0] &&
        image.width <= config.widthRange[1],
    );
    TestValidator.predicate(
      `${config.type} image should have realistic height`,
      image.height >= config.heightRange[0] &&
        image.height <= config.heightRange[1],
    );
  }
  // Validate all images have unique IDs
  const imageIds = uploadedImages.map((img) => img.id);
  const uniqueImageIds = new Set(imageIds);
  TestValidator.equals(
    "all uploaded images should have unique IDs",
    imageIds.length,
    uniqueImageIds.size,
  );
  // Validate that different image types can coexist
  TestValidator.equals(
    "should have uploaded all four image types",
    uploadedImages.length,
    4,
  );
  // Validate metadata consistency across all images
  for (const image of uploadedImages) {
    TestValidator.predicate(
      `image ${image.image_type} should have valid file size`,
      image.file_size > 0,
    );
    TestValidator.predicate(
      `image ${image.image_type} should have valid dimensions`,
      image.width > 0 && image.height > 0,
    );
    TestValidator.predicate(
      `image ${image.image_type} should have valid storage path`,
      image.storage_path.length > 0 &&
        image.storage_path.includes(image.filename),
    );
    TestValidator.predicate(
      `image ${image.image_type} should have meaningful alt text`,
      image.alt_text !== null && image.alt_text.length > 0,
    );
  }
}
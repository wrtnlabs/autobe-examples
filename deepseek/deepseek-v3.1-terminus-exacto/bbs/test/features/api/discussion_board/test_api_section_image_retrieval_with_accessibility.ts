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

export async function test_api_section_image_retrieval_with_accessibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
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
  // 3. Upload an image with alt text
  const altText = RandomGenerator.paragraph({ sentences: 1 });
  const image =
    await generate_random_discussion_board_admin_sections_images_create(
      adminConnection,
      {
        params: {
          sectionId: section.id,
        },
        body: {
          filename: `${RandomGenerator.alphabets(8)}.jpg`,
          mime_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<50000> &
              tags.Maximum<2000000>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<800> & tags.Maximum<1920>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<600> & tags.Maximum<1080>
          >(),
          image_type: "banner" as const,
          storage_path: `/sections/${section.id}/images/${RandomGenerator.alphabets(16)}.jpg`,
          alt_text: altText,
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(image);
  // 4. Retrieve the image
  const retrievedImage =
    await api.functional.discussionBoard.admin.sections.images.at(
      adminConnection,
      {
        sectionId: section.id,
        imageId: image.id,
      },
    );
  typia.assert(retrievedImage);
  // 5. Validate accessibility features and complete image retrieval
  TestValidator.equals("image ID matches", retrievedImage.id, image.id);
  TestValidator.equals(
    "filename matches",
    retrievedImage.filename,
    image.filename,
  );
  TestValidator.equals(
    "mime type matches",
    retrievedImage.mime_type,
    image.mime_type,
  );
  TestValidator.equals(
    "file size matches",
    retrievedImage.file_size,
    image.file_size,
  );
  TestValidator.equals("width matches", retrievedImage.width, image.width);
  TestValidator.equals("height matches", retrievedImage.height, image.height);
  TestValidator.equals(
    "image type matches",
    retrievedImage.image_type,
    image.image_type,
  );
  TestValidator.equals(
    "storage path matches",
    retrievedImage.storage_path,
    image.storage_path,
  );
  TestValidator.equals(
    "alt text is properly returned",
    retrievedImage.alt_text,
    altText,
  );
  TestValidator.equals(
    "section ID matches",
    retrievedImage.section.id,
    section.id,
  );
  TestValidator.equals(
    "section name matches",
    retrievedImage.section.name,
    section.name,
  );
  TestValidator.predicate(
    "alt text provides accessibility",
    retrievedImage.alt_text !== null && retrievedImage.alt_text.length > 0,
  );
}

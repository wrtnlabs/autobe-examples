import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post(
  input?: DeepPartial<ICommunityPlatformPost.ICreate> | undefined,
): ICommunityPlatformPost.ICreate {
  const contentType =
    input?.contentType ??
    RandomGenerator.pick(["text", "link", "image"] as const);
  return {
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 5 }),
    contentType,
    text:
      contentType === "text"
        ? input?.text !== undefined
          ? input.text === null
            ? null
            : {
                body: input.text.body ?? typia.random<boolean>(),
              }
          : {
              body: typia.random<boolean>(),
            }
        : null,
    link:
      contentType === "link"
        ? input?.link !== undefined
          ? input.link === null
            ? null
            : {
                url: input.link.url ?? typia.random<boolean>(),
              }
          : {
              url: typia.random<boolean>(),
            }
        : null,
    image:
      contentType === "image"
        ? input?.image !== undefined
          ? input.image === null
            ? null
            : {
                image_url: input.image.image_url ?? typia.random<boolean>(),
                image_alt_text: input.image.image_alt_text ?? null,
                presentation_width: input.image.presentation_width ?? null,
                presentation_height: input.image.presentation_height ?? null,
              }
          : {
              image_url: typia.random<boolean>(),
              image_alt_text: null,
              presentation_width: null,
              presentation_height: null,
            }
        : null,
  };
}

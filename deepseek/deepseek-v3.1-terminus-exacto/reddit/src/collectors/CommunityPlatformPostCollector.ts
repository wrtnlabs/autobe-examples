import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostCollector {
  export async function collect(props: {
    body: ICommunityPlatformPost.ICreate;
    communityPlatformUsers: IEntity;
    communityPlatformUserSessions: IEntity;
  }) {
    const id = v4();
    const now = new Date();
    // Lookup community by name
    const community =
      await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
        where: { name: props.body.community_name },
      });
    // Build base post data
    const baseData = {
      id,
      title: props.body.title,
      post_type: props.body.post_type,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      user: { connect: { id: props.communityPlatformUsers.id } },
      community: { connect: { id: community.id } },
    };
    // Handle post-type-specific content
    let textContent = undefined;
    let linkContent = undefined;
    let imageContent = undefined;
    switch (props.body.post_type) {
      case "text":
        if (props.body.text_content) {
          textContent = {
            create: {
              id: v4(),
              content: props.body.text_content,
              content_length: props.body.text_content.length,
              format_type: "plain",
              edit_count: 0,
              created_at: now,
              updated_at: now,
            },
          };
        }
        break;
      case "link":
        if (props.body.link_url) {
          // Extract domain from URL for the required domain field
          const domain = new URL(props.body.link_url).hostname;
          linkContent = {
            create: {
              id: v4(),
              url: props.body.link_url,
              title: props.body.title,
              domain: domain,
              created_at: now,
              updated_at: now,
            },
          };
        }
        break;
      case "image":
        if (props.body.image_url) {
          imageContent = {
            create: {
              id: v4(),
              image_url: props.body.image_url,
              thumbnail_url: props.body.image_url,
              alt_text: props.body.image_alt ?? null,
              file_size: 0,
              image_width: 0,
              image_height: 0,
              thumbnail_width: 0,
              thumbnail_height: 0,
              file_format: "jpeg",
              created_at: now,
              updated_at: now,
            },
          };
        }
        break;
    }
    return {
      ...baseData,
      textContent,
      linkContent,
      imageContent,
    } satisfies Prisma.community_platform_postsCreateInput;
  }
}

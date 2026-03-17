import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostLinkCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostLink.ICreate;
    post: IEntity;
  }) {
    // Extract domain from URL
    let domain: string;
    try {
      const urlObj = new URL(props.body.url);
      domain = urlObj.hostname.replace(/^www\./, "");
    } catch (error) {
      // Fallback: try to extract domain manually
      const url = props.body.url;
      const domainMatch = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/?#]+)/);
      domain = domainMatch ? domainMatch[1] : "unknown";
    }
    return {
      // Scalar fields
      id: v4(),
      url: props.body.url,
      domain,
      title: props.body.title ?? null,
      description: props.body.description ?? null,
      thumbnail_url: props.body.thumbnail_url ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation
      post: { connect: { id: props.post.id } },
    } satisfies Prisma.community_platform_post_linksCreateInput;
  }
}

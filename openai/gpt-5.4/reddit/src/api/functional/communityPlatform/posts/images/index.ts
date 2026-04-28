import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformPostImage } from "../../../../structures/ICommunityPlatformPostImage";

/**
 * Retrieve the stored image attachment record for a specific post image within a specific post.
 *
 * This operation returns the image-specific metadata normalized into the community_platform_post_images table for an image-based post. In the database design, the main community_platform_posts record stores shared post identity, authorship, community placement, title, content classification, and lifecycle state, while the attached image content is separated into its own one-to-one subsidiary record. The returned resource therefore represents the current uploaded image attached to the referenced post, including its permanent storage location, original filename, detected MIME type, stored byte size, and any available width and height metadata.
 *
 * The operation supports the requirement that stored post images remain associated with the related image post and are available when users view an image post in feeds or single-post views. Because the requirements state that any user may view an image post in those contexts, this read operation is intended to be available to guests, members, and admins, subject to the underlying post remaining viewable according to its current lifecycle state and any broader visibility rules applied by the service layer. The endpoint does not grant independent ownership over image records; it only exposes the image that belongs to the specified post.
 *
 * The relationship between the two path parameters is important. Although the client supplies both postId and imageId, the service must verify that the community_platform_post_images record identified by imageId actually belongs to the community_platform_posts record identified by postId. This prevents cross-post resource addressing and keeps the nested route aligned with the subsidiary nature of the image table. If the post does not exist, the image does not exist, or the image belongs to a different post, the request must be rejected as not found.
 *
 * Clients will commonly use this endpoint after first obtaining a post reference from a feed or a single-post retrieval flow. Feed requirements define that image posts show a thumbnail in list presentation, while full single-post viewing requires the stored post image to remain associated with the post content. This operation provides the concrete image attachment record needed by those views. It does not upload, replace, or remove media, and it does not define any CDN behavior or storage-capacity guarantee because the approved requirements explicitly leave those non-functional concerns out of scope.
 *
 * @param props.connection
 * @param props.postId Target post's ID that owns the image attachment
 * @param props.imageId Target image attachment's ID within the specified post
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement a read-only service that fetches one
 *   community_platform_post_images record together with its owning
 *   community_platform_posts record for validation.
 *
 * Step 1: Validate postId and imageId as UUID path parameters.
 *
 * Step 2: Query community_platform_posts by id = postId and community_platform_post_images by id = imageId, preferably in a single joined lookup using the relation community_platform_post_images.community_platform_post_id = community_platform_posts.id. The query must confirm that the image row belongs to the referenced post.
 *
 * Step 3: Reject the request when no post exists for postId, when no image exists for imageId, or when the image exists but community_platform_post_id does not equal postId. Return a not-found style error for all of these mismatches so the nested resource boundary is preserved.
 *
 * Step 4: Enforce viewability checks against the owning post before returning media information. The service should verify that the post is an image post by checking community_platform_posts.post_type and should ensure the post is in a viewable lifecycle state according to post business rules and moderation behavior. Do not expose image data for deleted or otherwise non-viewable post records.
 *
 * Step 5: Map the database row to ICommunityPlatformPostImage. Include fields derived from community_platform_post_images such as id, storage_uri, original_name, mime_type, byte_size, width, height, created_at, and updated_at according to the DTO definition. Do not fabricate CDN-transformed URLs or capacity metadata because those concerns are not defined by the requirements.
 *
 * Step 6: Return the image attachment object as application/json.
 *
 * Implementation notes: because community_platform_post_images has a unique constraint on community_platform_post_id, a post can have at most one current image attachment. The service should still use imageId from the route for exact matching. This endpoint is read-only and should not open a write transaction. Use consistent not-found handling to avoid leaking whether only the post exists or only the image exists.
 * @path /communityPlatform/posts/:postId/images/:imageId
 * @accessor api.functional.communityPlatform.posts.images.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Target post's ID that owns the image attachment
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Target image attachment's ID within the specified post
     */
    imageId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformPostImage;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/posts/:postId/images/:imageId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/posts/${encodeURIComponent(props.postId ?? "null")}/images/${encodeURIComponent(props.imageId ?? "null")}`;
  export const random = (): ICommunityPlatformPostImage =>
    typia.random<ICommunityPlatformPostImage>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("postId")(() => typia.assert(props.postId));
      assert.param("imageId")(() => typia.assert(props.imageId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformPost } from "../../../../structures/ICommunityPlatformPost";

export * as snapshots from "./snapshots/index";
export * as texts from "./texts/index";
export * as links from "./links/index";
export * as images from "./images/index";
export * as comments from "./comments/index";
export * as votes from "./votes/index";

/**
 * Create a new community post authored by the authenticated member.
 *
 * This operation creates a new Post, which the domain model defines as the platform’s top-level community content item. A post is a single published item created by one user and placed within one specific community. The created record must therefore establish the post’s required title, author identity, and community context at creation time, and it becomes the root item for later discussion activity such as comments, votes, and reports. The returned resource represents the newly published post in its canonical detailed form.
 *
 * Access to this operation is intended for authenticated members. Guests are described as unauthenticated visitors who can browse public feeds, communities, posts, comments, and user profiles, while members are the actor class that can create and manage posts and participate in communities. The server must derive the author identity from the authenticated member context rather than trusting a client-supplied author field. If the target community does not exist, is unavailable for posting, or the caller is not permitted to participate in that community, the operation must reject the request.
 *
 * The creation workflow must align with the post concept and downstream feed behavior. A Post always has a required title that serves as its main label wherever the post is shown, including home, popular, and community feeds. The platform also presents author username, community name, vote score, comment count, and posted time in feeds, so the newly created post should be initialized in a state suitable for immediate inclusion in those views. Vote score and comment count begin from their initial values, and posted time is assigned by the system when the post is persisted.
 *
 * This operation also establishes the content form of the post according to its type. The requirements for post presentation distinguish text posts, image posts, and link posts, each of which has different feed preview behavior. Because of that, the request body must contain post-type-specific creation data, and the service must validate that the submitted content matches the selected type before saving the main post and any related subtype data. A text post must provide written body content suitable for text preview behavior, an image post must provide image asset references suitable for thumbnail presentation, and a link post must provide a URL suitable for domain-name presentation.
 *
 * Clients commonly use this operation together with list and detail retrieval APIs. After creation, the resulting post should become visible through the relevant community feed and, where applicable, popular or personalized home feed logic. Later changes to the post’s content should be handled by the separate post update operation, and removal from feeds and direct viewing should be handled by the separate post erase operation. If the client needs to display the broader discussion state after publication, the post detail and comment-thread retrieval operations should be executed after this creation call.
 *
 * Error handling should clearly distinguish invalid input, unavailable community context, and authorization failures. The service must reject malformed or incomplete type-specific content, attempts to create a post without the required title, and attempts by unauthenticated or unauthorized callers. The operation should only succeed once the platform has created the primary post record and any necessary subtype content records consistently so that the returned resource is immediately usable by API consumers.
 *
 * @param props.connection
 * @param props.body Information required to create a new post
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement this operation in the post service as a
 *   transactional create workflow for the primary post aggregate.
 *
 * 1. Authenticate the caller and require a member session. Reject guest and unauthenticated callers before any write logic begins.
 * 2. Validate the request body against ICommunityPlatformPost.ICreate. Require the title and the target community identifier from the payload, and validate the post type and its corresponding content fields. Do not accept client-supplied author identity; derive the author from the authenticated member.
 * 3. Load the target community and verify that posting is allowed in that community for the calling member. If the community does not exist or is unavailable for posting, return an appropriate error. If community participation restrictions apply, enforce them before creation.
 * 4. Normalize and validate post-type-specific content:
 *    - For text posts, require the written body content and validate it is present and non-empty.
 *    - For image posts, require the image asset reference or creation input needed by the image subtype workflow.
 *    - For link posts, require a valid URL input for the link subtype workflow.
 *    Reject combinations where the selected post type does not match the provided content structure.
 * 5. Insert the primary record in the community_platform_posts table with the validated title, resolved member author reference, resolved community reference, initial vote score, initial comment count, and server-assigned posted timestamp. Initialize aggregate counters to their starting values so feed and detail views can render immediately.
 * 6. Insert related subtype data according to the selected post type using the appropriate subsidiary table workflow for text, image, or link content. Ensure only the matching subtype record is created for the selected type.
 * 7. Commit the transaction only if both the primary post record and any required subtype records are successfully persisted. Roll back the whole transaction on any failure so no partial post is visible.
 * 8. Re-query or compose the created post into the detailed ICommunityPlatformPost response shape, including author and community presentation fields needed by clients.
 *
 * Business rules and edge cases:
 * - Enforce that the post remains bound to the original community selected at creation time; later edits must not move the post to a different community.
 * - Initialize comment count and vote score consistently for a newly created post.
 * - Ensure the created post is eligible for subsequent inclusion in community, popular, and subscribed home feed queries.
 * - If file-backed image creation is involved, validate that referenced assets satisfy the platform’s file policies before linking them to the post.
 * - Return not-found for unknown target community, forbidden for authenticated callers without posting permission, and validation errors for invalid title, invalid type, or missing type-specific content.
 * @path /communityPlatform/member/posts
 * @accessor api.functional.communityPlatform.member.posts.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Information required to create a new post
     */
    body: ICommunityPlatformPost.ICreate;
  };
  export type Body = ICommunityPlatformPost.ICreate;
  export type Response = ICommunityPlatformPost;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/member/posts",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/member/posts";
  export const random = (): ICommunityPlatformPost =>
    typia.random<ICommunityPlatformPost>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
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

/**
 * Update an existing community post authored by the authenticated member.
 *
 * This operation modifies the canonical post record stored in community_platform_posts, which is the top-level community post aggregate holding the post title, author reference, container community reference, content-type classification, and lifecycle state. It is intended for member-authored content maintenance after publication. In accordance with the post editing requirement, the member may update the post content according to the post's existing type while the post remains within its original community context.
 *
 * Only an authenticated member who originally created the target post may use this operation. Guests are not allowed to manage authored content, and no elevated administrator permission may be inferred for this API because the current requirements explicitly do not grant active admin platform behavior. The server must verify that the target post belongs to the requesting member before applying any changes. If the post is unavailable because it has already been removed from direct viewing or feed presentation, the operation must reject the update rather than recreating or restoring the content implicitly.
 *
 * The operation works against the normalized post structure defined by the database schema. The community_platform_posts table stores the shared post identity and common fields such as title and post_type, while variant-specific content is separated into dedicated one-to-one subtype tables. A text post uses community_platform_post_texts.body as its full written body content. A link post uses community_platform_post_links.target_url and its derived domain_display for recognizable source presentation in feeds. An image post uses community_platform_post_images and its stored asset metadata such as storage_uri, original_name, mime_type, byte_size, width, and height. Because these subtype tables exist specifically to keep unrelated nullable columns out of the main post table, updates must respect the existing content variant and modify only the subtype record associated with that post's stored post_type.
 *
 * This API is commonly used after the member has already retrieved the post through the single-post view. Pre-executing the post detail retrieval operation helps the client understand the current post type and existing content before submitting an update, especially because the allowed mutable content differs between text, link, and image variants. After a successful update, the returned post representation can be used to refresh the single post screen and any affected feed entry previews, such as the first 200 characters for text posts, the linked domain display for link posts, or the image thumbnail context for image posts.
 *
 * Validation must enforce business rules derived from the requirements and schema reality. The request must include a title because every post requires a title. The server must not move the post to a different community, must not change authorship, and must not change the existing post_type classification during an edit. Instead, the system updates the content fields that correspond to the already stored variant. Errors should be returned when the post does not exist, when the requester is not the author, when the post is no longer available for editing, or when the submitted content does not satisfy the expected variant-specific format.
 *
 * @param props.connection
 * @param props.postId Target post's ID
 * @param props.body Updated post title and type-specific content
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Load the target row from community_platform_posts by
 *   id = :postId and deleted_at IS NULL, including its related community,
 *   current subtype row, and author member reference. Fail with not found if no
 *   active post exists for the identifier. Authenticate the caller as a member
 *   and verify the loaded post.community_platform_member_id matches the
 *   authenticated member id; otherwise reject with forbidden.
 *
 * Validate the request body against ICommunityPlatformPost.IUpdate. Allow updates only to mutable post fields: title and variant-specific content corresponding to the existing post_type stored in community_platform_posts. Do not permit changes to community_platform_community_id, community_platform_member_id, post_type, status, created_at, updated_at, or deleted_at from client input. Enforce that title is present and non-empty according to DTO validation rules.
 *
 * For a post whose post_type indicates text, update community_platform_posts.title and the related community_platform_post_texts.body record in a single transaction. For a link post, update community_platform_posts.title and the related community_platform_post_links.target_url, then recompute and persist domain_display from the normalized target URL. For an image post, update community_platform_posts.title and replace or update the related community_platform_post_images record according to the request DTO contract, persisting storage_uri and related metadata generated by the file handling pipeline rather than trusting client-supplied metadata blindly.
 *
 * Preserve the original community association from community_platform_posts.community_platform_community_id exactly as required by the business rules. Do not create a different subtype row or switch between text, link, and image variants during update. If the subtype row expected by the stored post_type is missing, fail with an internal consistency error rather than attempting to infer replacement structure.
 *
 * Update community_platform_posts.updated_at and the updated_at column of the affected subtype table within the same transaction. Optionally create a new community_platform_post_snapshots record capturing the new revision state if the implementation includes edit history generation for post lifecycle playback. The snapshot must reference the same post id and maintain monotonic revision_no ordering.
 *
 * Return the refreshed detailed post aggregate as ICommunityPlatformPost by reloading the post with its normalized subtype data and any derived presentation fields needed by the single-post view. Ensure error handling covers: post not found, unauthenticated caller, caller not author, invalid variant-specific payload, unavailable or deleted target post, and storage or URL normalization failures during subtype update.
 * @path /communityPlatform/member/posts/:postId
 * @accessor api.functional.communityPlatform.member.posts.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Target post's ID
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Updated post title and type-specific content
     */
    body: ICommunityPlatformPost.IUpdate;
  };
  export type Body = ICommunityPlatformPost.IUpdate;
  export type Response = ICommunityPlatformPost;

  export const METADATA = {
    method: "PUT",
    path: "/communityPlatform/member/posts/:postId",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}`;
  export const random = (): ICommunityPlatformPost =>
    typia.random<ICommunityPlatformPost>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("postId")(() => typia.assert(props.postId));
      assert.body(() => typia.assert(props.body));
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

/**
 * Permanently remove a post that belongs to the authenticated member.
 *
 * This operation deletes a single record from the post resource represented by the community platform's top-level community posts authored by members within a specific community. In the business domain, a post is the primary published discussion item inside a community and maintains relationships to its author, its community, its comments, its votes, and any moderation reports associated with it. The loaded requirements define deletion as a business outcome that removes the affected concept from active platform use, and they further state that members may delete their own posts under normal user rules.
 *
 * Access to this operation is restricted to an authenticated member who is the author of the targeted post. The business rules explicitly state that when a member deletes a post, the platform shall allow the deletion only if the member is the author of that post, and that any attempt to delete a post created by another user under normal user rules must be rejected. This endpoint therefore documents the self-managed ownership path for post deletion and does not grant community-wide moderation authority. Moderator and owner content removal in their own community belongs to separate moderation workflows.
 *
 * At the data level, this operation targets the primary post entity and relies on the persisted author relationship to determine whether the caller is permitted to erase the record. Because the post remains associated with its author and community for all non-deleted posts, the authorization check must be performed before removal while the record is still active. Consumers typically obtain candidate post identifiers from list and detail retrieval operations, then call this endpoint when the author chooses to remove one of their own published posts.
 *
 * If the post does not exist, the platform must reject the request. If the authenticated member is not the author, the platform must also reject the request. On success, the post is removed from active use as part of the platform's deletion lifecycle. No request body is required because the path parameter fully identifies the target resource, and no response body is required because the endpoint performs a terminal erase action on the specified post resource.
 *
 * @param props.connection
 * @param props.postId Target post's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a service method that accepts the
 *   authenticated member context and the target postId.
 *
 * Load the target record from the community_platform_posts table by its primary identifier. If no active record exists for the supplied postId, return a not-found error.
 *
 * Validate ownership by comparing the authenticated member identifier with the post's author member identifier stored on the post record. If they do not match, reject the request with a forbidden error because normal user deletion is allowed only for the author of the post.
 *
 * Execute deletion of the target post in a transaction. The realize agent must inspect the actual foreign key structure and referential actions defined for community_platform_posts and its related tables before implementation. If dependent rows such as comments, votes, snapshots, report bindings, text/link/image subtype rows, or other child records are not automatically removed by database-level cascading rules, explicitly remove or otherwise resolve those dependent rows within the same transaction so that no invalid references remain.
 *
 * After deletion, return success with no response body. Ensure the operation is idempotent from the client perspective only in the sense that a second call for a no-longer-existing post should result in not found rather than partial success. Log the deletion event through normal application observability mechanisms if available, but do not create a separate user-facing moderation action because this endpoint is the author's own deletion flow rather than moderator enforcement.
 * @path /communityPlatform/member/posts/:postId
 * @accessor api.functional.communityPlatform.member.posts.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Target post's ID
     */
    postId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/communityPlatform/member/posts/:postId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("postId")(() => typia.assert(props.postId));
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

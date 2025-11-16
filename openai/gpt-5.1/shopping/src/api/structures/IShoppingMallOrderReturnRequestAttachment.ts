import { tags } from "typia";

export namespace IShoppingMallOrderReturnRequestAttachment {
  /**
   * Nested DTO representing a single evidence attachment associated with a
   * new order return request.
   *
   * Attachments are typically images or documents that support the customer’s
   * claim, such as photos of damaged products or shipping labels. Files must
   * be uploaded to a storage service ahead of time and referenced here by
   * URL; the API never accepts raw binary or base64 data.
   */
  export type ICreate = {
    /**
     * Human-readable name or caption for this evidence attachment,
     * displayed to reviewers and in customer-facing UIs.
     */
    name: string & tags.MinLength<1>;

    /**
     * File extension of the attached evidence resource, such as `jpg`,
     * `png`, or `pdf`.
     *
     * This field helps consumers infer the media type and may be used for
     * basic validation or rendering decisions.
     */
    extension: string & tags.MinLength<1>;

    /**
     * Public or signed URL pointing to the immutable, already-uploaded file
     * used as evidence for this return request.
     *
     * The backend treats this URL as a reference and does not manage upload
     * or storage lifecycle within this API.
     */
    url: string & tags.Format<"uri">;

    /**
     * Optional classification of the attachment within the context of the
     * return request, such as `product_photo`, `package_photo`, or
     * `receipt`.
     *
     * Allowed values are aligned with platform-level configuration. When
     * omitted, the server may infer or default the type based on file
     * metadata or other heuristics.
     */
    type?: string | undefined;
  };

  /**
   * Nested DTO representing updates to a single evidence attachment
   * associated with an existing order return request.
   *
   * This structure can be used to add new attachments or modify metadata for
   * previously attached evidence, depending on how the server interprets the
   * update semantics for the parent `IShoppingMallOrderReturnRequest.IUpdate`
   * payload.
   */
  export type IUpdate = {
    /**
     * Updated human-readable name or caption for the evidence attachment.
     *
     * If provided, it replaces the existing name for the targeted
     * attachment.
     */
    name?: (string & tags.MinLength<1>) | undefined;

    /**
     * Updated file extension value for the attachment, if its
     * classification needs correction.
     *
     * In most flows this field is rarely changed after creation.
     */
    extension?: (string & tags.MinLength<1>) | undefined;

    /**
     * URL of the evidence file. When adding new attachments through an
     * update, this field points to the already-uploaded resource.
     *
     * For existing attachments, changes to this field are typically
     * restricted or interpreted as replacement, subject to business rules.
     */
    url?: (string & tags.Format<"uri">) | undefined;

    /**
     * Updated classification for the attachment (for example,
     * `product_photo`, `package_photo`, or `receipt`).
     *
     * When provided, this value replaces the existing type metadata for the
     * attachment.
     */
    type?: string | undefined;
  };

  /**
   * Summary representation of a single evidence attachment associated with an
   * order return request.
   *
   * Attachments are compositional children of the return request and
   * typically reference immutable media such as photos or documents that help
   * reviewers evaluate the claim. This summary type is used when embedding
   * attachments into `IShoppingMallOrderReturnRequest` and related DTOs.
   *
   * The shopping mall platform follows a strict URL-only file handling model.
   * Backend APIs never accept or return raw binary or base64-encoded file
   * content; instead, they only work with pre-uploaded file URLs that are
   * managed by a dedicated storage layer.
   */
  export type ISummary = {
    /**
     * Human-readable name or caption for this evidence attachment, suitable
     * for display in customer and back-office UIs.
     *
     * Clients typically derive this from the original file name or from a
     * user-provided caption at upload time. The value should be concise but
     * descriptive enough to help reviewers understand what the attachment
     * shows without opening it.
     */
    name: string & tags.MinLength<1>;

    /**
     * File extension of the evidence resource, such as `jpg`, `png`, or
     * `pdf`.
     *
     * This value is used for basic client-side rendering decisions and for
     * simple validation of attachment types. It should reflect the actual
     * file type stored at the `url`, without a leading dot and using
     * lowercase by convention.
     */
    extension: string & tags.MinLength<1>;

    /**
     * Public or signed URL pointing to the immutable, already-uploaded file
     * associated with this evidence attachment.
     *
     * Clients must upload the binary asset to a storage service first and
     * then supply only this reference URL to the shopping mall backend. The
     * backend never accepts binary data or base64 content in this field; it
     * treats the URL as an opaque pointer that can be dereferenced by
     * clients when they need to view the evidence.
     */
    url: string & tags.Format<"uri">;

    /**
     * Optional business classification of the attachment within the context
     * of the return request, such as `product_photo`, `package_photo`, or
     * `receipt`.
     *
     * The precise set of values is determined by platform configuration.
     * When omitted, the consumer may infer the role of the attachment from
     * its usage context or MIME type, but clients are encouraged to
     * populate this field to improve review efficiency and downstream
     * analytics.
     */
    type?: string | undefined;
  };
}
